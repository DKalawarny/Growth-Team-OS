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
import { getJurisdictionLinks } from './jurisdictionLinks'

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

  const [bpRes, msRes, ciRes, kfRes, fsRes, analysis, ragChunks, pastChats] = await Promise.all([
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
    // RAG semantic search — only runs when a query is provided.
    // Returns the most relevant chunks across the ENTIRE library.
    // Falls back to [] silently if OpenAI key is missing or RPC fails.
    query
      ? searchKnowledge(companyId, query, { limit: 10, threshold: 0.28 })
      : Promise.resolve([]),
    // Chat history search — already kicked off above before the Promise.all.
    chatHistoryPromise,
  ])

  const bp        = bpRes.data ?? {}
  const allMiles  = msRes.data ?? []
  const checkins  = ciRes.data ?? []
  const knowledge = kfRes.data ?? []
  const snapshots = fsRes.data ?? []
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

  return {
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
    // Jurisdiction-specific authority links — used by Solomon (and any tool
    // prompt) to REDIRECT instead of advise on legal / employment-standards /
    // workplace-safety / tax questions. Null when location is missing or
    // unknown — Solomon then asks where the owner is based instead of
    // guessing a URL. See lib/jurisdictionLinks.js for the source of truth.
    jurisdiction_authorities: getJurisdictionLinks(bp.location),
    // Credit & liquidity — set once in Settings, always included so every tool
    // and the Advisor can reason about the owner's true available capital without
    // them having to re-enter it each time.
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
    roadmap: {
      total:               allMiles.length,
      completed:           completedCount,
      weighted_pct_done:   weightedPct,  // the number the owner sees on /roadmap
      active_focus:        active,
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
