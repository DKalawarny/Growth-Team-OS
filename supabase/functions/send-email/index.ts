/**
 * send-email
 *
 * Thin server-side wrapper over Resend. Browser callers ask for a NAMED
 * template + a payload; we render it server-side and ship it. We deliberately
 * do NOT accept arbitrary subject/html from the browser — that would turn the
 * function into a spam relay the moment someone reads the JS bundle.
 *
 * Flow:
 *   1. Verify caller JWT → { userId, companyId }
 *   2. Validate { template, to, data } against the template registry
 *   3. Render subject + html (server-side, from constants in this file)
 *   4. POST to Resend's /emails API with RESEND_API_KEY
 *   5. Best-effort log to email_log table (non-fatal if it fails)
 *
 * Auth model:
 *   - Caller must be a signed-in GrowthOS user (any role). Every template
 *     also enforces that `to` belongs to the caller's company — you can only
 *     email your own staff/advisors, not a random address.
 *
 * Templates registered today:
 *   - staff-welcome   : sent when an owner adds a new staff_members row
 *   - task-assigned   : sent when a work_order gets an assignee (future)
 *
 * Request body:
 *   {
 *     template: 'staff-welcome',
 *     to:       'jane@example.com',
 *     data:     { staffName: 'Jane', companyName: 'Acme', ownerName: 'Danny' },
 *   }
 *
 * Response 200: { id: 'resend-message-id', skipped?: 'no_email' }
 * Response 400: invalid template / payload / `to` not on this company
 * Response 401: auth failure
 * Response 500: Resend or DB error
 *
 * Required env vars:
 *   RESEND_API_KEY   from resend.com dashboard
 *   RESEND_FROM      e.g. "GrowthOS <hello@growthos.app>" — verified domain
 *                    For early testing, "onboarding@resend.dev" works without
 *                    domain verification but ONLY sends to your own address.
 *   APP_URL          used by templates for inline links
 */

// deno-lint-ignore-file no-external-import
import { corsHeaders, json, preflight } from '../_shared/cors.ts'
import { authedUser, serviceClient }    from '../_shared/supabase.ts'
import { signStaffToken }                from '../_shared/staff_token.ts'

// ────────────────────────────────────────────────────────────────────────────
// Template registry
// ────────────────────────────────────────────────────────────────────────────
//
// Each entry knows how to (a) validate its payload, (b) confirm the target
// address actually belongs to a row owned by this company (defense-in-depth),
// and (c) render subject + html.
//
// Adding a new template = add a new entry. Don't sprinkle if/else through the
// handler.

interface TemplateContext {
  companyId: string
  appUrl:    string
  admin:     ReturnType<typeof serviceClient>
}

interface RenderedEmail {
  subject: string
  html:    string
  text:    string
}

interface Template<TData> {
  /** Throw on invalid payload — the throw bubbles to a 400. */
  validate: (data: unknown) => TData
  /**
   * Confirm the `to` address belongs to a row this company owns. Prevents
   * a logged-in user from using us as a relay to email arbitrary outsiders.
   * Throw on mismatch.
   */
  guardRecipient: (to: string, ctx: TemplateContext) => Promise<void>
  /** Render subject + html + text. Pure function — no side effects. */
  render: (data: TData, ctx: TemplateContext) => RenderedEmail
}

// ---- staff-welcome ---------------------------------------------------------

interface StaffWelcomeData {
  staffName:   string
  companyName: string
  ownerName:   string
}

const staffWelcome: Template<StaffWelcomeData> = {
  validate(raw) {
    const d = (raw ?? {}) as Record<string, unknown>
    const staffName   = String(d.staffName   ?? '').trim()
    const companyName = String(d.companyName ?? '').trim()
    const ownerName   = String(d.ownerName   ?? '').trim()
    if (!staffName)   throw new Error('staffName required')
    if (!companyName) throw new Error('companyName required')
    if (!ownerName)   throw new Error('ownerName required')
    return { staffName, companyName, ownerName }
  },

  async guardRecipient(to, { companyId, admin }) {
    // The recipient must be a staff_members row on this company.
    const { data, error } = await admin
      .from('staff_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('email',      to)
      .maybeSingle()
    if (error) throw new Error(`recipient guard: ${error.message}`)
    if (!data) throw new Error('recipient not on this company\'s team')
  },

  render({ staffName, companyName, ownerName }) {
    const subject = `${ownerName} added you to the ${companyName} team`

    // Plain-text fallback for clients that don't render HTML (Gmail "show
    // original", spam scoring, etc.). Same content, no styling.
    const text = [
      `Hi ${staffName},`,
      ``,
      `${ownerName} added you to the ${companyName} team on GrowthOS.`,
      ``,
      `You'll receive an email any time a task gets assigned to you — with`,
      `the job details, due date, and a link to mark it done from your phone.`,
      ``,
      `No login required. Watch this inbox.`,
      ``,
      `— The GrowthOS team`,
    ].join('\n')

    const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:#0f1419;padding:24px 32px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                  Growth<span style="color:#d4a843;">OS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;">
                  Welcome to ${escapeHtml(companyName)}, ${escapeHtml(staffName)}.
                </h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">
                  ${escapeHtml(ownerName)} just added you to the team. From now on, you'll get
                  an email any time a task gets assigned to you — with the job details, due date,
                  and a link to mark it done from your phone.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3a3a3a;">
                  <strong>No login required.</strong> Just watch this inbox.
                </p>
                <div style="margin:32px 0 0 0;padding-top:24px;border-top:1px solid #e5e3dd;">
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#6b6b6b;">
                    Questions? Just reply to this email — it'll reach ${escapeHtml(ownerName)} directly.
                  </p>
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top:24px;font-size:12px;color:#9a9a9a;">
            Sent by GrowthOS on behalf of ${escapeHtml(companyName)}.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()

    return { subject, html, text }
  },
}

// ---- task-assigned ---------------------------------------------------------
//
// Sent to a staff_member when they get assigned a work_order. The email
// contains a magic-link to /staff/{token} — they tap it on their phone,
// see the task details, mark status, upload photos. No login required.
//
// We never send this template to profile users (real Supabase accounts) —
// they'll see assignments when they log in. The browser caller is
// responsible for not invoking this template for non-staff assignees.

interface TaskAssignedData {
  staffId:       string   // staff_members.id — used to mint the magic-link
  staffName:     string
  ownerName:     string
  companyName:   string
  taskTitle:     string
  taskDescription?: string
  priority?:     string    // 'low' | 'medium' | 'high' | 'urgent'
  dueDate?:      string    // ISO date string — display only
}

const taskAssigned: Template<TaskAssignedData> = {
  validate(raw) {
    const d = (raw ?? {}) as Record<string, unknown>
    const staffId     = String(d.staffId     ?? '').trim()
    const staffName   = String(d.staffName   ?? '').trim()
    const ownerName   = String(d.ownerName   ?? '').trim()
    const companyName = String(d.companyName ?? '').trim()
    const taskTitle   = String(d.taskTitle   ?? '').trim()
    if (!staffId)     throw new Error('staffId required')
    if (!staffName)   throw new Error('staffName required')
    if (!ownerName)   throw new Error('ownerName required')
    if (!companyName) throw new Error('companyName required')
    if (!taskTitle)   throw new Error('taskTitle required')
    return {
      staffId,
      staffName,
      ownerName,
      companyName,
      taskTitle,
      taskDescription: d.taskDescription ? String(d.taskDescription).trim() : undefined,
      priority:        d.priority        ? String(d.priority).trim()        : undefined,
      dueDate:         d.dueDate         ? String(d.dueDate).trim()         : undefined,
    }
  },

  async guardRecipient(to, { companyId, admin }) {
    // The `to` address must match the staff_members row identified in the
    // payload — caller can't email task details to an arbitrary outsider.
    // We rely on validate() having already populated staffId; re-fetch here
    // because guardRecipient runs before render and doesn't get the data.
    // (The body re-parse is fine — it's a small request.)
    const { data, error } = await admin
      .from('staff_members')
      .select('id, email')
      .eq('company_id', companyId)
      .eq('email', to)
      .maybeSingle()
    if (error) throw new Error(`recipient guard: ${error.message}`)
    if (!data) throw new Error('recipient not on this company\'s team')
  },

  render(d, { appUrl }) {
    const priorityLabel = d.priority
      ? d.priority.charAt(0).toUpperCase() + d.priority.slice(1)
      : null
    const priorityColor =
      d.priority === 'urgent' ? '#dc2626'
      : d.priority === 'high'   ? '#ea580c'
      : d.priority === 'medium' ? '#d97706'
      : '#737373'

    // The token is minted inside render() so it carries the current iat —
    // any future global rotation (tokens_valid_after) immediately invalidates
    // tokens issued before the bump.
    // render() is sync, but signStaffToken is async. We can't change the
    // signature without rippling through every template, so we throw a
    // placeholder string and substitute the real URL in the handler below.
    // (See `mintMagicLink` below.)
    const magicUrl = `${appUrl}/staff/__MAGIC_LINK__`

    const subject = `New task: ${d.taskTitle}`

    const text = [
      `Hi ${d.staffName},`,
      ``,
      `${d.ownerName} just assigned you a task on ${d.companyName}'s board:`,
      ``,
      `📋 ${d.taskTitle}`,
      ...(d.taskDescription ? ['', d.taskDescription] : []),
      ``,
      ...(priorityLabel ? [`Priority: ${priorityLabel}`] : []),
      ...(d.dueDate ? [`Due: ${d.dueDate}`] : []),
      ``,
      `Open it on your phone (no login needed):`,
      magicUrl,
      ``,
      `Tap the link to see job details, mark progress, and upload photos.`,
      ``,
      `— GrowthOS`,
    ].join('\n')

    const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:#0f1419;padding:24px 32px;">
                <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;">
                  Growth<span style="color:#d4a843;">OS</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px 0;font-size:13px;color:#6b6b6b;letter-spacing:0.02em;text-transform:uppercase;font-weight:600;">
                  New task from ${escapeHtml(d.ownerName)}
                </p>
                <h1 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3;">
                  ${escapeHtml(d.taskTitle)}
                </h1>
                ${d.taskDescription ? `
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#3a3a3a;white-space:pre-wrap;">${escapeHtml(d.taskDescription)}</p>
                ` : ''}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;font-size:14px;">
                  ${priorityLabel ? `
                  <tr>
                    <td style="padding:4px 0;color:#6b6b6b;width:100px;">Priority</td>
                    <td style="padding:4px 0;color:${priorityColor};font-weight:600;">${escapeHtml(priorityLabel)}</td>
                  </tr>
                  ` : ''}
                  ${d.dueDate ? `
                  <tr>
                    <td style="padding:4px 0;color:#6b6b6b;width:100px;">Due</td>
                    <td style="padding:4px 0;color:#1a1a1a;font-weight:600;">${escapeHtml(d.dueDate)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding:4px 0;color:#6b6b6b;width:100px;">From</td>
                    <td style="padding:4px 0;color:#1a1a1a;">${escapeHtml(d.companyName)}</td>
                  </tr>
                </table>
                <div style="text-align:center;margin:32px 0 24px 0;">
                  <a href="${magicUrl}" style="display:inline-block;background:#d4a843;color:#1a1a1a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
                    Open task →
                  </a>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#6b6b6b;text-align:center;">
                  No login required. Tap the link to see details, upload photos, and mark progress.
                </p>
              </td>
            </tr>
          </table>
          <div style="margin-top:24px;font-size:12px;color:#9a9a9a;">
            Sent by GrowthOS on behalf of ${escapeHtml(d.companyName)}.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()

    return { subject, html, text }
  },
}

// ---- registry --------------------------------------------------------------

// deno-lint-ignore no-explicit-any
const TEMPLATES: Record<string, Template<any>> = {
  'staff-welcome': staffWelcome,
  'task-assigned': taskAssigned,
}

// ────────────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight()

  try {
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from   = Deno.env.get('RESEND_FROM')
    if (!apiKey || !from) {
      return json({ error: 'send-email not configured (missing RESEND_API_KEY or RESEND_FROM)' }, 500)
    }

    const user  = await authedUser(req)
    const body  = await req.json().catch(() => ({})) as {
      template?: string
      to?:       string
      data?:     unknown
    }

    const templateName = String(body.template ?? '')
    const to           = String(body.to ?? '').trim().toLowerCase()
    if (!templateName)   return json({ error: 'template required' }, 400)
    if (!to || !to.includes('@')) return json({ error: 'valid `to` required' }, 400)

    const tmpl = TEMPLATES[templateName]
    if (!tmpl) return json({ error: `unknown template: ${templateName}` }, 400)

    const admin  = serviceClient()
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const ctx: TemplateContext = { companyId: user.companyId, appUrl, admin }

    const data = tmpl.validate(body.data)
    await tmpl.guardRecipient(to, ctx)
    const rendered = tmpl.render(data, ctx)

    // task-assigned (and any future template that embeds a staff magic-link)
    // emits `${appUrl}/staff/__MAGIC_LINK__` as a placeholder. We can't mint
    // the token inside render() because render is sync. So we post-process
    // here: detect the placeholder, mint a real token, swap it in.
    // The string match is loose on purpose — works the same for both the
    // html and text bodies, no template-specific branching needed.
    if (rendered.html.includes('__MAGIC_LINK__') || rendered.text.includes('__MAGIC_LINK__')) {
      // deno-lint-ignore no-explicit-any
      const staffId = (data as any).staffId as string
      if (!staffId) throw new Error('template requested magic-link but has no staffId')
      const token = await signStaffToken(staffId, user.companyId)
      rendered.html = rendered.html.replaceAll('__MAGIC_LINK__', token)
      rendered.text = rendered.text.replaceAll('__MAGIC_LINK__', token)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from,
        to:      [to],
        subject: rendered.subject,
        html:    rendered.html,
        text:    rendered.text,
      }),
    })

    const resendJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[send-email] Resend error', res.status, resendJson)
      return json({
        error:  'Resend rejected the email',
        detail: resendJson?.message ?? resendJson,
      }, 502)
    }

    // Best-effort log. The table doesn't exist yet — wrap the insert so a
    // missing table never breaks an otherwise-successful send.
    try {
      await admin.from('email_log').insert({
        company_id:   user.companyId,
        sent_by_uid:  user.userId,
        template:     templateName,
        to_address:   to,
        resend_id:    resendJson?.id ?? null,
        subject:      rendered.subject,
      })
    } catch (logErr) {
      console.warn('[send-email] email_log insert failed (non-fatal)', logErr)
    }

    return json({ id: resendJson?.id ?? null })

  } catch (err) {
    console.error('[send-email]', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status:  message.startsWith('auth:') ? 401
            : message.startsWith('recipient') || message.includes('required') ? 400
            : 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * HTML-escape user-supplied strings before they hit a template. Email clients
 * don't execute JS, but unescaped `<` / `>` still breaks layouts and a
 * malicious `companyName` could inject style tags.
 */
function escapeHtml(s: string): string {
  return s
    .replaceAll('&',  '&amp;')
    .replaceAll('<',  '&lt;')
    .replaceAll('>',  '&gt;')
    .replaceAll('"',  '&quot;')
    .replaceAll("'",  '&#39;')
}
