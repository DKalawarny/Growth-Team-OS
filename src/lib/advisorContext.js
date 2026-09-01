import { supabase } from './supabase'
import { detectStage } from './stageEngine'
import {
  computeWeightedProgress,
  classifyAll,
  todayYmd,
} from './milestoneProgress'
import { getLibraryAnalysis } from './libraryAnalysis'
import { getTodaysPulse }     from './dailyPulse'
import { searchKnowledge, formatRagResults } from './rag/search'
import { searchChatHistory, formatChatHistory } from './rag/chatSearch'
import { compressSafetyContext } from './rag/compress'
import { embed as embedQuery } from './rag/embeddings'
import { getJurisdictionLinks } from './jurisdictionLinks'
import { detectSafetyTopics, loadRegulatorySources } from './regulatorySources'
import { referenceCanonBlock } from './references'
import { loadMemory, formatMemory } from './memory'
import { roadmapDrift, describeDrift } from './roadmapFingerprint'

// Safety vault — char budget for direct loading (no embeddings path).
// Owner uploads SOPs, SDS sheets, permits. We load the most recent
// `is_current=true` docs up to this byte ceiling, hand them to the
// Haiku compressor along with the regulatory_sources rows, and let
// Solomon answer from the compressed brief. Budget chosen so even
// a 5-doc vault of long SOPs (~6k chars each) fits comfortably.
const SAFETY_VAULT_LIMIT       = 12
const SAFETY_VAULT_CHAR_BUDGET = 60_000

/**
 * Build the structured BUSINESS_CONTEXT block appended to every Advisor turn.
 *
 * We include:
 *   - The core business_profiles fields (stage derived from current_revenue)
 *   - A trimmed website excerpt (capped ~3k chars to keep token costs sane)
 *   - The roadmap in compact form:
 *       * weighted completion % + task count (so Claude can cite progress)
 *       * the top 6 milestones ordered by "what to do next" — in-progress →
 *         overdue → ready → blocked. Each includes weight, progress, status,
 *         and target date so the advisor can give *specific* advice.
 *   - A handful of recent check-ins if they exist.
 *   - Uploaded knowledge files (from /documents → Uploaded tab) — the
 *     platform's "tell Claude about my business" library. Each file is
 *     included with title + kind + notes + excerpt, within a budget so
 *     a 50-file library doesn't blow the prompt.
 *
 * Why these specific milestone fields:
 *   weight           lets Claude say "this is a big one — worth ~18% of your plan"
 *   progress_percent lets Claude say "you're halfway there, keep going" vs. "you haven't started"
 *   status           lets Claude respect dependencies ("you can't start X yet, Y isn't done")
 *   start/end dates  let Claude anchor advice in time ("due next month")
 *
 * Returned as a plain JSON-ish object. The Advisor page stringifies it and
 * appends to the system prompt.
 *
 * Token budget rough math (Claude Sonnet):
 *   profile + stage + goals       ~400 tokens
 *   milestone slice (6 × 120 toks) ~720 tokens
 *   website excerpt (3k chars)    ~900 tokens
 *   recent check-ins (5)          ~300 tokens
 *   total context                 ~2300 tokens per turn
 */

const WEBSITE_EXCERPT_CHARS  = 3000
const MAX_ACTIVE_MILESTONES  = 6
const MAX_RECENT_CHECKINS    = 5

// Financial snapshot budget — separate from uploaded knowledge files because
// they're structurally different (auto-pulled, always fresh, always short).
//   - MAX_SNAPSHOTS:       cap how many snapshots we pull in. In practice this
//                          is "latest P&L + latest BS" (2 rows). If more
//                          report types come online we keep the 4 newest.
//   - MAX_SNAPSHOT_CHARS:  ceiling per-snapshot. normalized_text is already
//                          terse (~1-2KB) but this is the safety belt.
const MAX_SNAPSHOTS        = 4

// Past this, a QuickBooks sync is describing a month that has already closed.
// Exported so the Advisor's "refresh" strip and Solomon's own wording agree —
// two different numbers for "old" is how a UI ends up contradicting the model.
export const STALE_FINANCIALS_DAYS = 35
const MAX_SNAPSHOT_CHARS   = 4000

// Knowledge file budget.
//   - MAX_KNOWLEDGE_FILES: cap number of files included per turn (favour
//                          recency; older files probably still exist but we
//                          don't want 50 handbooks in one prompt).
//   - MAX_CHARS_PER_FILE:  how much of each file's extracted text we include.
//                          ~3000 chars ≈ 800 tokens. Enough for a one-page SOP
//                          or an executive-summary style doc.
//   - MAX_TOTAL_CHARS:     hard cap across all files to protect the prompt
//                          budget when the owner has uploaded many short docs.
const MAX_KNOWLEDGE_FILES = 8

const MAX_CHARS_PER_FILE  = 3000
const MAX_TOTAL_CHARS     = 18000

// People and work. Kept small on purpose — Solomon needs to know who is here
// and roughly what they do, not a full HR record.
const MAX_STAFF       = 40
const MAX_WORK_ORDERS = 30
const MAX_PLAYBOOKS   = 20


/**
 * Rank order for milestone surfacing.
 * We want Claude to see in-progress items *first* — that's usually where the
 * conversation is going to land. Blocked items go last because bringing them
 * up as advice would confuse the owner (they literally can't start yet).
 */
const STATUS_RANK = {
  'in-progress': 0,
  'overdue':     1,
  'ready':       2,
  'blocked':     3,
  'done':        9, // excluded below, but defined for safety
}

/**
 * @param {string} companyId
 * @param {object} [options]
 * @param {string} [options.userId]  Today's daily pulse from localStorage.
 * @param {string} [options.query]   The user's current question or message.
 *   When provided, knowledge retrieval switches from naive (newest-first
 *   injection) to RAG (semantic search finds the most relevant chunks across
 *   the ENTIRE library — including books, long manuals, and image descriptions).
 *   Without a query, the system falls back to injecting the 8 most recent
 *   files verbatim (backward-compatible with the pre-RAG behaviour).
 */
export async function buildAdvisorContext(companyId, { userId, query } = {}) {
  // Kick off chat history search in parallel with everything else.
  // Returns [] if: no query, no OpenAI key, no past chats, or RPC fails.
  const chatHistoryPromise = (query && userId)
    ? searchChatHistory(companyId, userId, query, { limit: 4, threshold: 0.35 })
    : Promise.resolve([])
  if (!companyId) return null

  // ── Safety topic detection (free — pure regex) ─────────────────────
  // We run this BEFORE any retrieval so the safety-vault search only
  // fires when the question looks safety-related. False negatives are
  // cheap (no citation); false positives are not (Solomon cites the
  // wrong reg). See regulatorySources.js for the patterns.
  const safetyTopics = query ? detectSafetyTopics(query) : []

  // Broader "is this safety-ish at all?" check — used to gate the
  // safety vault RPC call when topic detection is empty. We don't want
  // to skip the RPC entirely on empty topics (the vault might have
  // non-topic docs like "site-specific evacuation plan"), but we DO
  // want to skip it when the question is clearly off-topic
  // ("what's our cash position?"). This is cheap insurance against
  // burning a RPC + cosine search on every conversational turn.
  const looksSafetyish = query && (
    safetyTopics.length > 0 ||
    /\b(SOP|safety|hazard|PPE|SDS|FLHA|toolbox|near[-\s]?miss|incident|injury|exposure|respirator|barrier|protect(ion|ive)?)\b/i.test(query)
  )

  // Embed the query ONCE and reuse for the general knowledge search.
  // The safety vault path does NOT use embeddings — we load recent docs
  // directly and let the Haiku compressor pick what's relevant. This
  // keeps the stack Claude-only without a third-party embedding API.
  // If/when an OpenAI key is added and the vault grows past ~30 docs,
  // swap this back to searchSafetyDocs() — the RPC is still in place.
  const queryEmbeddingPromise = query
    ? embedQuery(query).catch(err => {
        console.warn('[advisorContext] query embedding failed:', err)
        return null
      })
    : Promise.resolve(null)

  const [bpRes, msRes, ciRes, kfRes, fsRes, analysis, ragChunks, pastChats, safetyChunksRes,
         staffRes, woRes, tplRes, memoryRows, coRes] = await Promise.all([
    supabase
      .from('business_profiles')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('milestones')
      .select('id, title, description, timeframe, category, completed, weight, progress_percent, start_date, end_date, depends_on, sort_order')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('checkins')
      .select('created_at, win, challenge, revenue_update, mood')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(MAX_RECENT_CHECKINS),
    // Knowledge file metadata — we always fetch this so we have titles/kinds
    // for the RAG formatter. We omit extracted_text in RAG mode (chunks hold
    // the content); include it in naive mode for backward compat.
    supabase
      .from('knowledge_files')
      .select(query
        ? 'id, title, kind, notes, status, created_at'
        : 'id, title, kind, notes, extracted_text, status, created_at'
      )
      .eq('company_id', companyId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(MAX_KNOWLEDGE_FILES),
    // Financial snapshots — auto-pulled from QBO/Xero via Edge Functions.
    supabase
      .from('financial_snapshots')
      .select('id, source, report_type, period_label, period_end, normalized_text, synced_at')
      .eq('company_id', companyId)
      .order('synced_at', { ascending: false })
      .limit(MAX_SNAPSHOTS),
    // Library intelligence — synthesised cross-file analysis.
    getLibraryAnalysis(companyId).catch(() => null),
    // RAG semantic search — only runs when a query is provided. Waits
    // for the shared query embedding so we don't double-embed.
    query
      ? queryEmbeddingPromise.then(vec =>
          vec ? searchKnowledge(companyId, query, { queryEmbedding: vec, limit: 10, threshold: 0.28 }) : []
        )
      : Promise.resolve([]),
    // Chat history search — already kicked off above before the Promise.all.
    chatHistoryPromise,
    // Safety vault — direct load (no embeddings). Gated on `looksSafetyish`
    // so off-topic turns skip the query entirely. We pull the most recent
    // is_current docs and hand them to the Haiku compressor downstream,
    // which is the path that does the "find the relevant section" work
    // that vector search would otherwise do.
    looksSafetyish
      ? supabase
          .from('safety_documents')
          .select('id, title, doc_type, content, created_at')
          .eq('company_id', companyId)
          .eq('is_current', true)
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(SAFETY_VAULT_LIMIT)
      : Promise.resolve({ data: [] }),
    // The crew. Without this Solomon cannot say anything real about hiring,
    // who is carrying too much, or who could run a job without the owner —
    // he was previously never told these people existed.
    supabase
      .from('staff_members')
      .select('id, name, role, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(MAX_STAFF),
    // Recent work, so "who actually does what here" is evidence rather than
    // an org chart the owner drew once.
    supabase
      .from('work_orders')
      .select('id, title, status, due_date, staff_member_id, milestone_id, updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(MAX_WORK_ORDERS),
    // Playbooks — what the business already knows how to do without the owner.
    supabase
      .from('work_order_templates')
      .select('id, name, description')
      .eq('company_id', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(MAX_PLAYBOOKS),
    // Durable memory. Unlike chat retrieval this is NOT searched — every
    // active row goes in on every turn. It is small by design, and the whole
    // point is that Solomon doesn't have to go looking for what he knows.
    loadMemory(companyId, userId).catch(() => []),
    // Last entry of the same Promise.all — one more round trip would be a
    // waste for a single jsonb column, and this is on the hot path for every
    // advisor turn.
    supabase
      .from('companies')
      .select('roadmap_built_from')
      .eq('id', companyId)
      .maybeSingle(),
  ])

  const bp        = bpRes.data ?? {}
  const allMiles  = msRes.data ?? []
  const checkins  = ciRes.data ?? []
  const knowledge = kfRes.data ?? []

  // Pack safety vault rows into the shape compressSafetyContext expects:
  //   { title, doc_type, content, similarity }
  //
  // similarity is 1.0 for all rows — these are direct loads, not cosine
  // matches, but the compressor's UI/log uses similarity for display.
  // 100% reflects "owner uploaded this; it's authoritative for them."
  //
  // Char budget: newest doc first, take rows until we hit the ceiling.
  // Each row gets its content truncated so a single 50k-char SOP can't
  // crowd out the rest of the vault.
  let usedChars = 0
  const safetyChunks = []
  for (const row of safetyChunksRes.data ?? []) {
    if (usedChars >= SAFETY_VAULT_CHAR_BUDGET) break
    const remaining = SAFETY_VAULT_CHAR_BUDGET - usedChars
    // Cap any single doc at 1/3 of the total budget — leaves room for at
    // least three docs even when one is huge.
    const perDocCap = Math.min(remaining, Math.floor(SAFETY_VAULT_CHAR_BUDGET / 3))
    const raw       = row.content ?? ''
    const excerpt   = raw.length > perDocCap
      ? `${raw.slice(0, perDocCap)}\n[… truncated]`
      : raw
    safetyChunks.push({
      id:         row.id,
      title:      row.title,
      doc_type:   row.doc_type,
      content:    excerpt,
      similarity: 1.0,
    })
    usedChars += excerpt.length
  }
  const snapshots = fsRes.data ?? []

  // ⭐ HOW OLD ARE THE BOOKS?
  //
  // QuickBooks syncs only when somebody clicks Sync now — there is no cron, by
  // deliberate design (migration 008 names the exact trap: "no stale-data-but-
  // thinks-it's-fresh footgun"). The provenance was already passed through, so
  // Solomon could say "your QuickBooks sync to 18 August". What he had no way
  // to know was whether 18 August was yesterday or six weeks ago — so a stale
  // sync arrived looking exactly like this morning's, and a thirteen-week cash
  // forecast could be built on it without a word.
  //
  // A date he must subtract from today is not the same as being told it is old.
  // This does the arithmetic for him.
  const newestSync = snapshots
    .map(s => Date.parse(s.synced_at ?? ''))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0] ?? null
  const financialsFreshness = newestSync
    ? {
        synced_at: new Date(newestSync).toISOString(),
        days_old:  Math.floor((Date.now() - newestSync) / 86_400_000),
        // A month plus a few days: monthly books close on a cycle, so anything
        // past roughly one closed month is describing a period that has ended.
        stale:     (Date.now() - newestSync) / 86_400_000 > STALE_FINANCIALS_DAYS,
      }
    : null
  // RAG: format semantic search results using file metadata for titles/kinds.
  // If empty (no query, no key, or no relevant chunks), falls through to naive.
  const ragResults    = ragChunks?.length
    ? formatRagResults(ragChunks, knowledge)
    : []

  // Format past conversations for prompt injection. Null = nothing relevant found.
  const pastConversations = formatChatHistory(pastChats ?? [])

  const completedCount         = allMiles.filter(m => m.completed).length
  const { weightedPct, sharePctById } = computeWeightedProgress(allMiles)
  const statusById             = classifyAll(allMiles, todayYmd())

  // Resolve dependency UUIDs → titles so Claude can reason about the chain
  // in plain English ("X depends on Y") without having to match UUIDs.
  const titleById = new Map(allMiles.map(m => [m.id, m.title]))

  const active = allMiles
    .filter(m => !m.completed)
    .map(m => ({
      ...m,
      _status:   statusById.get(m.id),
      _share:    sharePctById.get(m.id) ?? 0,
    }))
    .sort((a, b) => {
      const rank = (STATUS_RANK[a._status] ?? 5) - (STATUS_RANK[b._status] ?? 5)
      if (rank !== 0) return rank
      // Within the same status bucket, earlier target dates first.
      return (a.end_date ?? '').localeCompare(b.end_date ?? '')
    })
    .slice(0, MAX_ACTIVE_MILESTONES)
    .map(m => ({
      title:          m.title,
      status:         m._status,                 // 'in-progress' | 'ready' | ...
      progress_pct:   m.progress_percent ?? 0,
      weight:         m.weight ?? 5,             // 1–10 business impact
      share_of_plan_pct: m._share,               // how much completing this moves the bar
      timeframe:      m.timeframe,
      category:       m.category,
      target_date:    m.end_date,
      blocked_by:     (m.depends_on ?? [])
        .map(id => titleById.get(id))
        .filter(Boolean),
    }))

  // Read today's daily pulse from localStorage (browser-side only).
  // This is the real-time signal that makes advice context-sensitive to TODAY,
  // not just the static profile. A coach who knows you're stressed gives
  // different advice than one working from a month-old intake form.
  const todaysPulse = userId ? getTodaysPulse(userId) : null

  // ── Build safety_context for Solomon ───────────────────────────────
  //
  // Three inputs feed the safety brief Solomon sees:
  //   1. safetyChunks       — cosine hits from the owner's vault
  //   2. regulatorySources  — URLs/summaries from migration 022's reference table
  //   3. (general ragChunks already separately fed into knowledge_files)
  //
  // If we have substantial input, run the Haiku compressor to distill it
  // into a focused brief — the cost lever. Otherwise pass raw chunks and
  // let Solomon read them himself.
  //
  // We only do regulatory lookup when:
  //   - query was provided (no point otherwise)
  //   - jurisdiction code resolved (otherwise we'd guess regs)
  //   - safetyTopics matched at least one pattern (otherwise it's not a safety question)
  const jurisdictionLinks  = getJurisdictionLinks(bp.location)
  const jurisdictionCode   = jurisdictionLinks?.code ?? null
  const regulatorySources  = (query && jurisdictionCode && safetyTopics.length)
    ? await loadRegulatorySources(jurisdictionCode, safetyTopics)
    : []

  // Compression — only worth running if there's meaningful retrieved
  // content. compressSafetyContext applies its own minimum-size gate and
  // returns { brief: null } when below threshold, so we can call it
  // unconditionally and let it decide. But to skip the import-time
  // cost path when there's nothing at all, short-circuit when empty.
  const hasSafetyContent = safetyChunks.length || regulatorySources.length
  const safetyCompressed = hasSafetyContent
    ? await compressSafetyContext({
        query,
        safetyChunks,
        knowledgeChunks:   [],  // general RAG already goes into knowledge_files
        regulatorySources,
      })
    : { brief: null, compressed: false, raw_chars: 0, brief_chars: 0 }

  // Build the safety_context payload Solomon's prompt will read.
  // Three shapes:
  //   - null         → no safety-relevant retrieval; Solomon falls back
  //                    to the redirect behaviour for safety questions.
  //   - {brief: ...} → Haiku compressed; Solomon quotes from the brief.
  //   - {raw: ...}   → too small to compress; Solomon reads raw chunks.
  let safetyContext = null
  if (hasSafetyContent) {
    if (safetyCompressed.brief) {
      safetyContext = {
        mode:  'compressed',
        brief: safetyCompressed.brief,
        topics:           safetyTopics,
        vault_doc_count:  safetyChunks.length,
        regulation_count: regulatorySources.length,
      }
    } else {
      // Raw passthrough — usually because total chars were below the
      // compression threshold (small vault) or Haiku failed.
      safetyContext = {
        mode: 'raw',
        topics:            safetyTopics,
        vault_excerpts:    safetyChunks.map(c => ({
          title:      c.title,
          doc_type:   c.doc_type,
          excerpt:    c.content,
          similarity: c.similarity,
        })),
        regulations:       regulatorySources.map(r => ({
          authority:       r.authority_name,
          regulation_name: r.regulation_name,
          url:             r.canonical_url,
          summary:         r.summary,
        })),
      }
    }
  }

  return {
    // ⭐ TODAY. Solomon had milestone target_dates, work-order due_dates and a
    // 13-week cash horizon, and no idea what day it was — so every relative
    // statement he made about time was a guess. He told Daniel a milestone
    // dated 17 May "isn't far off" on 21 August.
    //
    // The computed `status` on each milestone was already correct ('overdue'),
    // which is the tell: the data knew, the model could not check it.
    today: {
      date:    todayYmd(),
      weekday: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    },
    today_pulse: todaysPulse ?? null,
    business: {
      name:              bp.business_name ?? null,
      website:           bp.website ?? null,
      industry:          bp.industry ?? null,
      location:          bp.location ?? null,
      team_size:         bp.team_size ?? null,
      hours_per_week:    bp.hours_per_week ?? null,
      last_year_revenue: bp.last_revenue ?? null,
      current_revenue:   bp.current_revenue ?? null,
      profit_margin:     bp.profit ?? null,
      biggest_challenge: bp.biggest_challenge ?? null,
      primary_goals:     bp.primary_goal ?? [],
      goal_timeline:     bp.goal_timeline ?? null,
      vision_3yr:        bp.vision_3yr ?? null,
    },
    stage: detectStage(bp.current_revenue),
    // ── The people ────────────────────────────────────────────────────────
    // Solomon was previously never told who works here, which made every
    // answer about hiring, load, or who could run a job without the owner
    // pure generalisation. `tenure_months` is derived rather than raw dates
    // so he reasons about "been here a while" instead of quoting a hire date
    // back at the owner.
    people: (staffRes?.data ?? []).map(m => ({
      name:   m.name,
      role:   m.role ?? null,
      tenure_months: m.created_at
        ? Math.max(0, Math.round((Date.now() - new Date(m.created_at).getTime()) / 2_629_800_000))
        : null,
      open_work: (woRes?.data ?? []).filter(
        w => w.staff_member_id === m.id && w.status !== 'done'
      ).length,
    })),
    // Recent work, so "who does what here" is evidence rather than an org
    // chart drawn once and never revisited.
    recent_work: (woRes?.data ?? []).slice(0, MAX_WORK_ORDERS).map(w => ({
      title:    w.title,
      status:   w.status,
      due_date: w.due_date ?? null,
      assigned: w.staff_member_id
        ? ((staffRes?.data ?? []).find(m => m.id === w.staff_member_id)?.name ?? 'someone')
        : null,
    })),
    // What the business already knows how to do without the owner in the room.
    // Directly relevant to succession and to "can I step back".
    playbooks: (tplRes?.data ?? []).map(t => ({
      name: t.name,
      description: t.description ?? null,
    })),
    // Curated book canon. Solomon may reference ONLY these titles — see the
    // REFERENCING BOOKS section of ADVISOR_SYSTEM_PROMPT and lib/references.js
    // for why recalling books from training data is not acceptable here.
    reference_canon: referenceCanonBlock(),
    // What Solomon actually knows about this business, as opposed to what he
    // can find. See lib/memory.js and migration 027 for why these are
    // different things.
    memory: formatMemory(memoryRows),
    // Jurisdiction-specific authority links — used by Solomon (and any tool
    // prompt) to REDIRECT instead of advise on legal / employment-standards /
    // workplace-safety / tax questions. Null when location is missing or
    // unknown — Solomon then asks where the owner is based instead of
    // guessing a URL. See lib/jurisdictionLinks.js for the source of truth.
    jurisdiction_authorities: jurisdictionLinks,
    // Safety retrieval — when the question matched a safety topic AND we
    // found something in the owner's vault and/or the regulatory registry,
    // this is the focused brief Solomon should quote from instead of
    // redirecting. Null when no safety signal — Solomon's safety redirect
    // (in ADVISOR_SYSTEM_PROMPT) still applies. See lib/regulatorySources.js
    // for topic detection and migration 022 for the data tables.
    safety_context: safetyContext,
    // Credit & liquidity — set once in Settings, always included so every tool
    // and the Advisor can reason about the owner's true available capital without
    // them having to re-enter it each time.
    // How old the books are. Null when nothing has ever been synced.
    financials_freshness: financialsFreshness,
    credit_facilities: bp.financial_settings ? {
      overdraft_limit:    bp.financial_settings.overdraft_limit  ?? null,
      overdraft_drawn:    bp.financial_settings.overdraft_used   ?? null,
      overdraft_available: (bp.financial_settings.overdraft_limit != null && bp.financial_settings.overdraft_used != null)
        ? bp.financial_settings.overdraft_limit - bp.financial_settings.overdraft_used
        : null,
      cc_limit:           bp.financial_settings.cc_limit         ?? null,
      cc_balance:         bp.financial_settings.cc_balance       ?? null,
      cc_available:       (bp.financial_settings.cc_limit != null && bp.financial_settings.cc_balance != null)
        ? bp.financial_settings.cc_limit - bp.financial_settings.cc_balance
        : null,
    } : null,
    // ⭐ Money in the account that is not the owner's. The prompt-only version
    // of this held inside the cash-flow tool and failed in conversation — one
    // instruction competing with twenty thousand characters of other
    // instruction. A stored figure does not have to win an argument for
    // attention. Null when he has not told us, which is itself the useful
    // signal: Solomon then knows to ask rather than to assume there are none.
    remittances: (bp.financial_settings?.gst_frequency || bp.financial_settings?.payroll_deductions_frequency)
      ? {
          gst_hst: bp.financial_settings.gst_frequency
            ? {
                frequency:       bp.financial_settings.gst_frequency,
                typical_amount:  bp.financial_settings.gst_typical ?? null,
              }
            : null,
          payroll_deductions: bp.financial_settings.payroll_deductions_frequency
            ? {
                frequency:       bp.financial_settings.payroll_deductions_frequency,
                typical_amount:  bp.financial_settings.payroll_deductions_typical ?? null,
              }
            : null,
        }
      : null,
    roadmap: {
      total:               allMiles.length,
      completed:           completedCount,
      weighted_pct_done:   weightedPct,  // the number the owner sees on /roadmap
      active_focus:        active,
      // ⚠️ Whether this plan was built for the business he has NOW. Milestones
      // are generated once from business_profiles and never re-checked, so
      // without this Solomon reasons confidently from a roadmap made for a
      // company that no longer exists — and has no way of knowing. Null means
      // the roadmap predates the fingerprint column: unknown, not "fine".
      built_from_current_profile: coRes?.data?.roadmap_built_from
        ? (roadmapDrift(coRes.data.roadmap_built_from, bp).length === 0)
        : null,
      stale_because: coRes?.data?.roadmap_built_from
        ? describeDrift(roadmapDrift(coRes.data.roadmap_built_from, bp))
        : null,
    },
    website_excerpt: bp.website_content
      ? bp.website_content.slice(0, WEBSITE_EXCERPT_CHARS)
      : null,
    // Knowledge retrieval — two modes:
    //
    // RAG mode (query provided + OpenAI key set):
    //   Semantic search finds the most relevant chunks across the ENTIRE
    //   library — works on books, long manuals, and image/graph descriptions.
    //   Financial snapshots are still prepended (they're always relevant).
    //
    // Naive mode (no query, no OpenAI key, or RAG returns nothing):
    //   Injects the first MAX_CHARS_PER_FILE chars of the 8 most recent files.
    //   Backward-compatible with the pre-RAG behaviour.
    knowledge_files: ragResults.length
      ? budgetedKnowledge([], snapshots, ragResults)
      : budgetedKnowledge(knowledge, snapshots),
    // Library intelligence — the synthesised cross-file analysis. This is the
    // executive picture that emerges from reading ALL uploaded documents
    // together, not file-by-file. Every tool and the Advisor receives this so
    // Claude can reference specific strengths, gaps, and opportunities that
    // the owner's own documents revealed — not generic advice.
    library_intelligence: analysis ? {
      summary:       analysis.summary       ?? null,
      strengths:     analysis.strengths     ?? [],
      gaps:          analysis.gaps          ?? [],
      opportunities: analysis.opportunities ?? [],
      file_count:    analysis.file_count    ?? 0,
      // ⚠️ What this analysis actually read, versus what is in the library.
      // Without these two numbers Solomon quotes a summary built from the
      // twelve newest documents as though it were the whole picture — which
      // is a confident overstatement about the owner's own business, made
      // with data we had and did not pass on.
      library_total: analysis.library_total ?? analysis.file_count ?? 0,
      omitted:       analysis.omitted       ?? 0,
      analyzed_at:   analysis.analyzed_at   ?? null,
    } : null,
    recent_checkins: checkins.map(c => ({
      date:           c.created_at,
      win:            c.win,
      challenge:      c.challenge,
      revenue_update: c.revenue_update,
      mood:           c.mood,
    })),
    // Long-term memory — semantically relevant past Advisor conversations.
    // Null when: no query provided, OpenAI key missing, or no relevant history found.
    // When present, the Advisor page injects this into the system prompt so
    // Solomon can reference past discussions without re-reading every message ever sent.
    past_conversations: pastConversations ?? null,
  }
}

/**
 * Pack uploaded knowledge files + financial snapshots into the prompt within
 * a character budget.
 *
 * Algorithm:
 *   1. Financial snapshots go FIRST. They're small, structured, and usually
 *      the ground truth for any financial tool. Giving them priority means
 *      a CFO Dashboard run never loses its P&L to a giant uploaded PDF.
 *   2. Then uploaded files, sorted by recency (already done by the query).
 *   3. For each item: include title + kind + notes + up to
 *      MAX_CHARS_PER_FILE (or MAX_SNAPSHOT_CHARS for snapshots) of text.
 *      Append a "[…]" if truncated.
 *   4. Stop once running total reaches MAX_TOTAL_CHARS.
 *   5. Anything beyond the budget surfaces as `omitted` so Claude knows
 *      more context exists it didn't see.
 *
 * Snapshots are reshaped into the same {title, kind, notes, excerpt} shape as
 * uploaded files so downstream prompts don't have to special-case them — the
 * "kind" field ("financial") and source note ("QuickBooks · synced X") carry
 * the provenance. This is the non-invasive trick in one function.
 */
/**
 * @param {Array}  files       knowledge_files rows (naive mode) or [] (RAG mode)
 * @param {Array}  snapshots   financial_snapshots rows
 * @param {Array}  [ragItems]  Pre-formatted RAG results from formatRagResults()
 */
function budgetedKnowledge(files, snapshots = [], ragItems = []) {
  const totalAvailable = files.length + snapshots.length + ragItems.length
  if (totalAvailable === 0) return { included: [], omitted: 0, total_available: 0 }

  const included = []
  let totalChars = 0

  // ---- Financial snapshots first ----
  for (const s of snapshots) {
    if (totalChars >= MAX_TOTAL_CHARS) break

    const raw = s.normalized_text || ''
    const remainingBudget = MAX_TOTAL_CHARS - totalChars
    const allowed = Math.min(MAX_SNAPSHOT_CHARS, remainingBudget)
    const excerpt = raw.length > allowed
      ? `${raw.slice(0, allowed)}\n[… truncated]`
      : raw

    const reportLabel = {
      profit_and_loss: 'Profit & Loss',
      balance_sheet:   'Balance Sheet',
      cash_flow:       'Cash Flow Statement',
    }[s.report_type] ?? s.report_type

    const sourceLabel = s.source === 'quickbooks' ? 'QuickBooks'
      : s.source === 'xero'       ? 'Xero'
      : 'manual entry'
    const synced = s.synced_at ? new Date(s.synced_at).toISOString().slice(0, 10) : 'unknown'

    included.push({
      title:   `${reportLabel} · ${s.period_label}`,
      kind:    'financial',
      notes:   `Auto-synced from ${sourceLabel} on ${synced}. Use these numbers directly — they are current.`,
      excerpt,
    })
    totalChars += excerpt.length + 120
  }

  // ---- RAG results (semantic search mode) ----
  for (const r of ragItems) {
    if (totalChars >= MAX_TOTAL_CHARS) break

    const remainingBudget = MAX_TOTAL_CHARS - totalChars
    const allowed  = Math.min(MAX_CHARS_PER_FILE * 2, remainingBudget)  // RAG gets more budget — chunks are targeted
    const excerpt  = r.excerpt.length > allowed
      ? `${r.excerpt.slice(0, allowed)}\n[… truncated]`
      : r.excerpt

    included.push({
      title:    r.title,
      kind:     r.kind,
      notes:    r.notes
        ? `${r.notes} [Relevance: ${(r.similarity * 100).toFixed(0)}%]`
        : `[Relevance: ${(r.similarity * 100).toFixed(0)}%]`,
      excerpt,
    })
    totalChars += excerpt.length + 120
  }

  // ---- Uploaded knowledge files (naive / fallback mode) ----
  for (const f of files) {
    if (totalChars >= MAX_TOTAL_CHARS) break

    const remainingBudget = MAX_TOTAL_CHARS - totalChars
    const allowed = Math.min(MAX_CHARS_PER_FILE, remainingBudget)
    const raw = f.extracted_text || ''
    const excerpt = raw.length > allowed
      ? `${raw.slice(0, allowed)}\n[… truncated]`
      : raw

    included.push({
      title:    f.title,
      kind:     f.kind,
      notes:    f.notes || null,
      excerpt,
    })
    totalChars += excerpt.length + 120
  }

  return {
    included,
    omitted:         Math.max(0, totalAvailable - included.length),
    total_available: totalAvailable,
    mode:            ragItems.length > 0 ? 'rag' : 'naive',
  }
}
