/**
 * staff-portal
 *
 * Token-authenticated read/write endpoint for the /staff/{token} page —
 * field crew who don't have a Supabase Auth account and just open the
 * magic-link from their assignment email.
 *
 * Auth flow:
 *   1. Browser POSTs { token, op, ...args } where token came from the URL
 *   2. We verify the HMAC signature on the token (see _shared/staff_token.ts)
 *   3. We look up staff_members.id = token.sid, confirm company_id matches
 *      token.cid (defense-in-depth against a row being moved between
 *      companies and replaying an old token)
 *   4. We check token.iat >= staff_members.tokens_valid_after (revocation —
 *      the owner can bump that timestamp to invalidate every existing link
 *      for a single staff member without deleting the row)
 *   5. We touch staff_members.last_seen_at so the owner can see "Jane was
 *      last active 2 hours ago" in a future UI
 *
 * Why a token-and-op POST instead of a REST API:
 *   - One Edge Function = one Supabase secret to rotate (STAFF_LINK_SECRET)
 *   - Browser never holds Supabase credentials — the function uses the
 *     service-role key internally so we don't need RLS policies covering
 *     this access path
 *   - Operation list is closed: only the things the staff app needs.
 *     New verbs require an Edge Function change, which means review.
 *
 * Operations:
 *   load                  → { staff, company, work_orders } (each WO carries
 *                            its checklist_items array, ordered by position;
 *                            each item carries its comments array, newest first)
 *   updateStatus          → { ok: true } after updating status on a single
 *                            work_order that belongs to this staff member
 *   updateChecklistItem   → { ok: true } after ticking / unticking a single
 *                            checklist item; ownership verified via the
 *                            item's parent work_order
 *   submitDailyLog        → { ok: true, log } — end-of-day account of what
 *                            happened. Server sets the date, so it records the
 *                            past only and can never become scheduling.
 *   addStepComment        → { ok: true, comment } after inserting a field
 *                            comment against a checklist item; ownership
 *                            verified via the item's parent work_order.
 *                            Closes the "field reports back to the playbook"
 *                            loop — comments are what Solomon clusters to
 *                            suggest playbook improvements over time.
 *
 * Anything we ship later (photo upload, safety check-in) routes through
 * this same handler so the auth flow only lives in one place.
 */

import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { verifyStaffToken } from '../_shared/staff_token.ts'

interface LoadRequest {
  op: 'load'
  token: string
}

interface UpdateStatusRequest {
  op: 'updateStatus'
  token: string
  workOrderId: string
  status: 'backlog' | 'in_progress' | 'done'
}

interface UpdateChecklistItemRequest {
  op: 'updateChecklistItem'
  token: string
  itemId: string
  done: boolean
}

interface AddStepCommentRequest {
  op: 'addStepComment'
  token: string
  itemId: string
  text: string
  isVoice?: boolean
  // Closed set — must match the CHECK constraint in migration 021. The
  // edge function validates against ALLOWED_PROMPT_TYPES below so a
  // client typo doesn't reach the database.
  promptType?: 'free' | 'start_walk' | 'shift_end' | 'step_complete' | 'job_close' | 'near_miss'
}

type Request_ =
  | LoadRequest
  | UpdateStatusRequest
  | UpdateChecklistItemRequest
  | AddStepCommentRequest

// Statuses the staff portal is allowed to set. Owners can still set any
// status from the Board; the portal is locked to this short list so a
// renamed-to-an-internal-name status from the owner UI can never be set
// by the field crew accidentally.
const ALLOWED_STATUSES = ['backlog', 'in_progress', 'done'] as const

// Prompt types the staff portal can attach to a comment. Must stay in
// sync with the CHECK constraint in migration 021. Defaults to 'free'
// (the always-on 💬 button); other values come from workflow-triggered
// prompts the UI fires at known job moments.
//
// Note on 'near_miss': this is the "flag for office" insight-stream tag,
// NOT a safety-compliance record. FLHA, toolbox talks, and formal
// incident reports live in the CRM's safety module — those are signed,
// retained, audit-grade. A 'near_miss' here is just the crew getting
// something on the owner's radar in a low-friction way. The two systems
// hand off (a 'near_miss' comment may prompt the crew "want to open a
// formal report in the CRM?") but this row is never the legal record.
// See migration 021's "what this is NOT" block for the full boundary.
const ALLOWED_PROMPT_TYPES = [
  'free',
  'start_walk',
  'shift_end',
  'step_complete',
  'job_close',
  'near_miss',
] as const

// Hard cap on comment text — matches the CHECK length(text) <= 4000 in
// migration 021. Validate client-side too so we fail fast with a clear
// message instead of relying on the database to reject.
const MAX_COMMENT_LEN = 4000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    const body = (await req.json()) as Request_
    if (!body?.token) return json({ error: 'missing token' }, 400)

    // ---- Verify the token signature ----
    // verifyStaffToken throws on bad signature / malformed / wrong version.
    // We catch and return 401 — never leak the underlying reason to the
    // client, since "signature mismatch" vs "malformed" vs "expired version"
    // are all the same outcome from the caller's perspective: re-request a
    // fresh link.
    let payload
    try {
      payload = await verifyStaffToken(body.token)
    } catch (err) {
      console.warn('[staff-portal] token rejected:', err instanceof Error ? err.message : err)
      return json({ error: 'invalid_token' }, 401)
    }

    const admin = serviceClient()

    // ---- Look up the staff member ----
    const { data: staff, error: staffErr } = await admin
      .from('staff_members')
      .select('id, company_id, name, email, phone, role, tokens_valid_after')
      .eq('id', payload.sid)
      .maybeSingle()

    if (staffErr) {
      console.error('[staff-portal] staff lookup failed', staffErr)
      return json({ error: 'lookup_failed' }, 500)
    }
    if (!staff) {
      // Token verifies but the row is gone — owner deleted them from the team.
      // Tell the page to render "removed from team" without leaking that the
      // signature itself was fine.
      return json({ error: 'staff_removed' }, 404)
    }

    // Defense-in-depth: if a staff row was moved to a different company
    // (rare, but possible if someone reassigns rows via SQL), the cid in
    // the token won't match. Reject — they need a fresh link.
    if (staff.company_id !== payload.cid) {
      return json({ error: 'company_mismatch' }, 401)
    }

    // Revocation check: tokens_valid_after is a "rotate all links" knob.
    // If set, every token with iat < tokens_valid_after is rejected, even
    // if the signature is fine. Lets an owner kill a lost phone's access
    // without deleting the staff row.
    if (staff.tokens_valid_after) {
      const cutoff = Math.floor(new Date(staff.tokens_valid_after).getTime() / 1000)
      if (payload.iat < cutoff) {
        return json({ error: 'revoked' }, 401)
      }
    }

    // Touch last_seen_at — fire-and-forget. Don't await; if this UPDATE
    // races with another from a different tab, the later write wins and
    // that's fine. We don't want the portal to fail because a metadata
    // column write hiccuped.
    admin
      .from('staff_members')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', staff.id)
      .then(({ error }) => {
        if (error) console.warn('[staff-portal] last_seen_at write failed', error.message)
      })

    // ---- Dispatch on operation ----
    if (body.op === 'load') {
      // Pull the company name so the page header can show "Working for {Acme}".
      const { data: company } = await admin
        .from('companies')
        .select('id, name')
        .eq('id', staff.company_id)
        .maybeSingle()

      // All work orders assigned to this staff member. Sorted by due-date
      // ascending nulls last so the soonest work surfaces first — field
      // crew should see "today" before "no date".
      const { data: workOrders, error: woErr } = await admin
        .from('work_orders')
        .select('id, title, description, status, priority, due_date, created_at, milestone_id')
        .eq('staff_member_id', staff.id)
        .eq('company_id', staff.company_id) // belt + suspenders, mirrors the cid check
        .order('due_date',   { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (woErr) {
        console.error('[staff-portal] work_orders fetch failed', woErr)
        return json({ error: 'work_orders_failed' }, 500)
      }

      // ── Attach checklist items ───────────────────────────────────────────
      // One additional query, scoped by WO ids we just fetched. We can't do
      // this as an embedded select because RLS-via-service-role bypasses the
      // policies that would normally protect this, so explicit scoping is
      // safest. Silent-fail if migration 020 isn't applied — the portal
      // just shows no checklists rather than 500-ing.
      const woIds = (workOrders ?? []).map(w => w.id)
      const itemsByWo = new Map<string, Array<Record<string, unknown>>>()
      const itemIdsAll: string[] = []
      if (woIds.length) {
        const { data: items, error: itemsErr } = await admin
          .from('work_order_checklist_items')
          .select('id, work_order_id, position, text, notes, required, done, done_at')
          .in('work_order_id', woIds)
          .order('position', { ascending: true })
        if (itemsErr) {
          console.warn('[staff-portal] checklist items fetch failed', itemsErr.message)
        } else {
          for (const it of items ?? []) {
            const arr = itemsByWo.get(it.work_order_id) ?? []
            arr.push(it)
            itemsByWo.set(it.work_order_id, arr)
            itemIdsAll.push(it.id)
          }
        }
      }

      // ── Attach step comments ─────────────────────────────────────────────
      // One more scoped query for all step comments across these items.
      // We sort newest-first so the latest comment is what the crew sees
      // when they open a step. Silent-fail if migration 021 isn't applied
      // — comments simply don't show; checklist still works.
      const commentsByItem = new Map<string, Array<Record<string, unknown>>>()
      if (itemIdsAll.length) {
        const { data: comments, error: commentsErr } = await admin
          .from('work_order_step_comments')
          .select('id, checklist_item_id, work_order_id, staff_member_id, user_id, text, is_voice, prompt_type, created_at')
          .in('checklist_item_id', itemIdsAll)
          .order('created_at', { ascending: false })
        if (commentsErr) {
          console.warn('[staff-portal] step comments fetch failed', commentsErr.message)
        } else {
          // Resolve author display names in a single follow-up query per
          // table. We could embed via PostgREST joins but the explicit
          // scoping pattern matches the rest of this handler. For staff
          // names we already have the current staff member's name in
          // scope; we still need to look up *other* crew on the same WOs
          // (a job can be reassigned, and the previous staff's comments
          // should still attribute correctly).
          const staffIds = Array.from(new Set((comments ?? [])
            .map(c => c.staff_member_id).filter(Boolean) as string[]))
          const userIds = Array.from(new Set((comments ?? [])
            .map(c => c.user_id).filter(Boolean) as string[]))

          const staffNameById = new Map<string, string>()
          if (staffIds.length) {
            const { data: s } = await admin
              .from('staff_members')
              .select('id, name')
              .in('id', staffIds)
            for (const row of s ?? []) staffNameById.set(row.id, row.name)
          }
          const userNameById = new Map<string, string>()
          if (userIds.length) {
            // profiles.name (not full_name) — matches the column added in
            // migration 001. The fallback covers profiles with no name set.
            const { data: u } = await admin
              .from('profiles')
              .select('id, name')
              .in('id', userIds)
            for (const row of u ?? []) userNameById.set(row.id, row.name ?? 'Office')
          }

          for (const c of comments ?? []) {
            const arr = commentsByItem.get(c.checklist_item_id) ?? []
            arr.push({
              ...c,
              author_name: c.staff_member_id
                ? staffNameById.get(c.staff_member_id) ?? 'Crew'
                : c.user_id
                  ? userNameById.get(c.user_id) ?? 'Office'
                  : 'Crew',
            })
            commentsByItem.set(c.checklist_item_id, arr)
          }
        }
      }

      const workOrdersWithItems = (workOrders ?? []).map(w => ({
        ...w,
        checklist_items: (itemsByWo.get(w.id) ?? []).map(it => ({
          ...it,
          comments: commentsByItem.get(it.id as string) ?? [],
        })),
      }))

      return json({
        staff: {
          id:    staff.id,
          name:  staff.name,
          email: staff.email,
          phone: staff.phone,
          role:  staff.role,
        },
        company: {
          id:   company?.id   ?? staff.company_id,
          name: company?.name ?? null,
        },
        work_orders: workOrdersWithItems,
      })
    }

    if (body.op === 'updateStatus') {
      if (!body.workOrderId) return json({ error: 'missing workOrderId' }, 400)
      if (!ALLOWED_STATUSES.includes(body.status as typeof ALLOWED_STATUSES[number])) {
        return json({ error: 'invalid_status' }, 400)
      }

      // Scope the update by BOTH work_order id AND staff_member_id — a
      // tampered request that swaps in another staff member's work_order
      // id won't match the filter and the update returns zero rows.
      // Returning the updated row tells the caller whether anything moved.
      const { data, error: upErr } = await admin
        .from('work_orders')
        .update({ status: body.status })
        .eq('id', body.workOrderId)
        .eq('staff_member_id', staff.id)
        .eq('company_id', staff.company_id)
        .select('id, status')
        .maybeSingle()

      if (upErr) {
        console.error('[staff-portal] status update failed', upErr)
        return json({ error: 'update_failed' }, 500)
      }
      if (!data) {
        // Either the work order doesn't exist, isn't assigned to this
        // staff member, or belongs to a different company. All three
        // return the same generic error — no information leak about
        // which guard tripped.
        return json({ error: 'not_found' }, 404)
      }

      return json({ ok: true, work_order: data })
    }

    if (body.op === 'updateChecklistItem') {
      if (!body.itemId) return json({ error: 'missing itemId' }, 400)
      if (typeof body.done !== 'boolean') return json({ error: 'invalid_done' }, 400)

      // Verify the item belongs to a work order that this staff member owns.
      // We do this as a separate fetch (instead of a single update with a
      // subquery) because PostgREST doesn't make the latter trivial AND the
      // explicit check is easier to audit. The cost is one extra round-trip.
      const { data: itemRow, error: itemErr } = await admin
        .from('work_order_checklist_items')
        .select('id, work_order_id, work_orders!inner(staff_member_id, company_id)')
        .eq('id', body.itemId)
        .maybeSingle()

      if (itemErr) {
        console.error('[staff-portal] checklist lookup failed', itemErr)
        return json({ error: 'lookup_failed' }, 500)
      }
      // Same generic not_found if the item is missing OR the parent WO
      // doesn't belong to this staff member / company. No info leak about
      // which guard tripped.
      const parent = (itemRow as { work_orders?: { staff_member_id: string | null; company_id: string } } | null)?.work_orders
      if (!itemRow || !parent || parent.staff_member_id !== staff.id || parent.company_id !== staff.company_id) {
        return json({ error: 'not_found' }, 404)
      }

      const now = new Date().toISOString()
      const { data, error: upErr } = await admin
        .from('work_order_checklist_items')
        .update(
          body.done
            ? { done: true,  done_at: now,  done_by_staff_member_id: staff.id, done_by_user_id: null }
            : { done: false, done_at: null, done_by_staff_member_id: null,     done_by_user_id: null }
        )
        .eq('id', body.itemId)
        .select('id, done, done_at')
        .maybeSingle()

      if (upErr) {
        console.error('[staff-portal] checklist update failed', upErr)
        return json({ error: 'update_failed' }, 500)
      }

      return json({ ok: true, item: data })
    }

    if (body.op === 'addStepComment') {
      if (!body.itemId) return json({ error: 'missing itemId' }, 400)
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      if (!text) return json({ error: 'missing text' }, 400)
      if (text.length > MAX_COMMENT_LEN) return json({ error: 'text_too_long' }, 400)
      const promptType = body.promptType ?? 'free'
      if (!ALLOWED_PROMPT_TYPES.includes(promptType as typeof ALLOWED_PROMPT_TYPES[number])) {
        return json({ error: 'invalid_prompt_type' }, 400)
      }

      // Ownership check — same pattern as updateChecklistItem. We pull
      // the parent WO via the embedded join and verify it belongs to
      // this staff member and company. Anything else returns the same
      // generic not_found so we don't leak which guard tripped.
      const { data: itemRow, error: itemErr } = await admin
        .from('work_order_checklist_items')
        .select('id, work_order_id, work_orders!inner(staff_member_id, company_id)')
        .eq('id', body.itemId)
        .maybeSingle()

      if (itemErr) {
        console.error('[staff-portal] comment-target lookup failed', itemErr)
        return json({ error: 'lookup_failed' }, 500)
      }
      const parent = (itemRow as { work_order_id?: string; work_orders?: { staff_member_id: string | null; company_id: string } } | null)?.work_orders
      if (!itemRow || !parent || parent.staff_member_id !== staff.id || parent.company_id !== staff.company_id) {
        return json({ error: 'not_found' }, 404)
      }

      const { data: inserted, error: insErr } = await admin
        .from('work_order_step_comments')
        .insert({
          checklist_item_id: body.itemId,
          work_order_id:     (itemRow as { work_order_id: string }).work_order_id,
          company_id:        staff.company_id,
          staff_member_id:   staff.id,
          user_id:           null,
          text,
          is_voice:          body.isVoice === true,
          prompt_type:       promptType,
        })
        .select('id, checklist_item_id, work_order_id, staff_member_id, text, is_voice, prompt_type, created_at')
        .maybeSingle()

      if (insErr) {
        console.error('[staff-portal] comment insert failed', insErr)
        return json({ error: 'insert_failed' }, 500)
      }

      // ----------------------------------------------------------------
      // CRM webhook seam — DO NOT IMPLEMENT YET
      //
      // When the CRM's safety module exists, this is where a webhook
      // would fire for prompt_type === 'near_miss' (UI label: "Flag for
      // office"). The CRM would receive the comment ref and offer the
      // owner a one-click path: "Promote this field flag into a formal
      // incident report / FLHA followup?"
      //
      // Important boundary — the webhook is OFFER, not COPY. The comment
      // here remains a learning-stream entry. The CRM creates its own
      // signed, retention-controlled record if the owner accepts. We
      // deliberately don't auto-mirror so the two systems stay clean:
      //   - Eliv8 OS: free-form crew insight, clustered for Solomon
      //   - CRM:     legal-grade safety record, signed and defensible
      //
      // Payload sketch (for when we wire this up):
      //   { event: 'field_flag.created',
      //     company_id, work_order_id, comment_id,
      //     prompt_type: 'near_miss', is_voice, created_at,
      //     author: { staff_member_id, name },
      //     excerpt: text.slice(0, 280) }
      //
      // Until the CRM exists, the Board's "🚩 Field flags" drawer is
      // the owner's only inbox for these. That's intentional — we want
      // owners to feel the value of the insight stream BEFORE we hand
      // them the compliance machinery.
      // ----------------------------------------------------------------
      // if (promptType === 'near_miss' && env.CRM_WEBHOOK_URL) {
      //   fireCrmWebhook({ ... }).catch(err =>
      //     console.error('[staff-portal] crm webhook failed', err))
      // }

      // Echo back the author name so the optimistic UI doesn't have to
      // refetch just to render attribution.
      return json({
        ok: true,
        comment: {
          ...inserted,
          author_name: staff.name ?? 'Crew',
        },
      })
    }

    // ── submitDailyLog ────────────────────────────────────────────────────
    // Daniel, 1 Sep: "a link for a foreman like a daily log would work well."
    //
    // ⚠️ RECORDS THE PAST ONLY. No date is accepted from the client — the day
    // is the server's, so a foreman cannot log tomorrow and this cannot drift
    // into scheduling. That is the line that keeps the product from becoming
    // the dispatch tool Daniel said he does not want.
    //
    // Upsert, not insert: someone correcting himself at 6pm should replace his
    // own account of the day, not leave two contradictory versions for Solomon
    // to average. The unique index in 035 is what makes that safe.
    if (body.op === 'submitDailyLog') {
      const whatHappened = typeof body.whatHappened === 'string' ? body.whatHappened.trim() : ''
      if (!whatHappened) return json({ error: 'missing whatHappened' }, 400)
      if (whatHappened.length > MAX_COMMENT_LEN) return json({ error: 'text_too_long' }, 400)

      const blockers = typeof body.blockers === 'string' ? body.blockers.trim().slice(0, MAX_COMMENT_LEN) : null

      // Optional and deliberately loose — this is context for the owner, not a
      // timesheet. Anything unparseable is simply dropped rather than refused;
      // losing the hours is better than losing the whole log over them.
      let hours: number | null = null
      if (body.hours !== undefined && body.hours !== null && body.hours !== '') {
        const h = Number(body.hours)
        if (Number.isFinite(h) && h >= 0 && h <= 24) hours = h
      }

      // A work order is optional, but if one is named it must be this person's.
      // Same generic not_found as everywhere else so nothing leaks about which
      // guard tripped.
      let workOrderId: string | null = null
      if (body.workOrderId) {
        const { data: wo } = await admin
          .from('work_orders')
          .select('id, staff_member_id, company_id')
          .eq('id', body.workOrderId)
          .maybeSingle()
        const row = wo as { staff_member_id: string | null; company_id: string } | null
        if (!row || row.company_id !== staff.company_id || row.staff_member_id !== staff.id) {
          return json({ error: 'not_found' }, 404)
        }
        workOrderId = body.workOrderId
      }

      const today = new Date().toISOString().slice(0, 10)

      const { data: existing } = await admin
        .from('daily_logs')
        .select('id')
        .eq('company_id', staff.company_id)
        .eq('staff_member_id', staff.id)
        .eq('log_date', today)
        .is('work_order_id', workOrderId === null ? null : undefined)
        .maybeSingle()

      const payload = {
        company_id:      staff.company_id,
        staff_member_id: staff.id,
        work_order_id:   workOrderId,
        log_date:        today,
        what_happened:   whatHappened,
        blockers:        blockers || null,
        hours_on_site:   hours,
        updated_at:      new Date().toISOString(),
      }

      const res = existing?.id
        ? await admin.from('daily_logs').update(payload).eq('id', (existing as { id: string }).id).select('id, log_date').maybeSingle()
        : await admin.from('daily_logs').insert(payload).select('id, log_date').maybeSingle()

      if (res.error) {
        console.error('[staff-portal] daily log write failed', res.error)
        return json({ error: 'insert_failed' }, 500)
      }
      return json({ ok: true, log: res.data })
    }

    return json({ error: 'unknown_op' }, 400)
  } catch (err) {
    console.error('[staff-portal] handler error', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})
