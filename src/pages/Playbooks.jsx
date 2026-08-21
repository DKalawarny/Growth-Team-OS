import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * Playbooks — /playbooks
 *
 * The owner's process library. Each playbook is a named list of steps for a
 * repeating job ("Standard demo job", "Site walkthrough", "Trailer inspection").
 * When a work order is created from a playbook, those steps copy across as
 * checklist items the crew ticks off — including from the magic-link staff
 * portal on a phone in the field.
 *
 * This is the "replace yourself with process" feature. Owner-knowledge becomes
 * structured rows the crew works through, so the owner stops fielding
 * "what's next?" calls.
 *
 * Layout: two-pane. Left = list of playbooks + "+ New". Right = editor for
 * the selected one. On mobile, picking a playbook swaps the panes.
 *
 * Data shape lives in migration 020. Templates + items are managed here;
 * checklist instances are spawned at WO-create time and rendered elsewhere
 * (Board edit modal, Staff Portal).
 */

// ── Starter templates ────────────────────────────────────────────────────────
// One-click clones for the empty state. We bias toward demolition-flavoured
// examples because that's the lead industry, but the wording is generic
// enough that any trades owner sees the pattern. The owner clones one, then
// tweaks the steps to match how their own crew actually works.
//
// On tools/materials in step notes: where it adds value, the `notes` field
// carries a one-line "Tools / Materials" hint. This is the bootstrap before
// Solomon has enough data to learn patterns from completed jobs — the owner
// gets a sensible default to react to rather than a blank slate. As jobs
// run and crews leave comments, those notes get sharpened from real usage
// (Solomon: "across your last 8 kitchen demos crews flagged the cap kit
// didn't fit older copper — add 3/4" adapter to the truck list?").
//
// Safety language deliberately stays informal here. FLHA and formal
// incident reporting live in the CRM's safety module (see migration 021).
// What's in these playbooks are operational checklists, not compliance
// artifacts.
const STARTERS = [
  {
    name: 'Standard demo job',
    description: 'Site walkthrough → demolition → handover, every time.',
    items: [
      { text: 'Walk the site with the client',           required: true,  notes: 'Confirm scope, photograph existing conditions.' },
      { text: 'Disconnect utilities (power, gas, water)', required: true, notes: 'Get signed shut-off confirmation before the first swing.' },
      { text: 'Erect safety barriers + signage',         required: true },
      { text: 'Demolition',                              required: true },
      { text: 'Load-out and haul',                       required: true },
      { text: 'Final site cleanup',                      required: true },
      { text: 'Walk-through with client',                required: true,  notes: 'Get sign-off photo + signature.' },
    ],
  },
  {
    name: 'Kitchen demo',
    description: 'Strip a kitchen down to studs — cabinets, counters, plumbing, flooring.',
    items: [
      { text: 'Walk the kitchen with the homeowner',      required: true,  notes: 'Photograph existing conditions. Confirm what stays (appliances, fridge box, etc.) and what goes.' },
      { text: 'Shut off and cap water + drain lines',     required: true,  notes: 'Tools: pipe cutter, cap kit, shutoff key. Older copper needs a 3/4" adapter — check before you go.' },
      { text: 'Disconnect gas to range (if applicable)',  required: false, notes: 'Licensed only. Cap and tag the line.' },
      { text: 'Set up dust containment + floor protection', required: true, notes: 'Materials: 6-mil poly, painter\'s tape, drop cloths, 2x cardboard runners. Tape every doorway out of the kitchen.' },
      { text: 'Remove upper cabinets',                    required: true,  notes: 'Tools: cordless drill, pry bar, sledge. Two-person job — uppers fall.' },
      { text: 'Remove lower cabinets + island',           required: true,  notes: 'Disconnect plumbing under the sink BEFORE pulling the cabinet.' },
      { text: 'Remove countertops',                       required: true,  notes: 'Granite/quartz are heavy — get a second pair of hands or a dolly.' },
      { text: 'Strip flooring (tile, vinyl, hardwood)',   required: false, notes: 'Tools: floor scraper, oscillating tool, pry bar. Watch for subfloor damage underneath.' },
      { text: 'Remove backsplash + wall tile',            required: false },
      { text: 'Load-out: bin or trailer',                 required: true,  notes: 'Standard kitchen demo = 1× 4-yd dumpster. Heavy on cabinetry — fill bottom-up.' },
      { text: 'Final cleanup — broom + shop vac',         required: true },
      { text: 'Walk-through + sign-off photo',            required: true },
    ],
  },
  {
    name: 'Bathroom demo',
    description: 'Strip a bathroom — tub/shower, toilet, vanity, flooring.',
    items: [
      { text: 'Walk the bathroom with the homeowner',     required: true,  notes: 'Confirm what stays. Photograph existing conditions including any visible water damage.' },
      { text: 'Shut off + drain plumbing',                required: true,  notes: 'Shut water at the main if isolation valves are seized. Drain through the lowest fixture.' },
      { text: 'Remove toilet + cap drain',                required: true,  notes: 'Tools: socket wrench, rags, drain plug. Toilet wax ring gets messy — bag it immediately.' },
      { text: 'Disconnect + remove vanity',               required: true },
      { text: 'Remove tub or shower surround',            required: true,  notes: 'Cast iron tubs need a sledge + dust mask. Fibreglass cuts with a recip saw — score and snap.' },
      { text: 'Remove wall tile + cement board',          required: false, notes: 'Tools: hammer, pry bar, recip saw. Wear safety glasses — tile shards travel.' },
      { text: 'Strip flooring (tile, vinyl, lino)',       required: false, notes: 'Subfloor often rotted under toilets — check before you finish demo so you can quote the repair.' },
      { text: 'Cap supply + drain lines',                 required: true },
      { text: 'Load-out + cleanup',                       required: true,  notes: 'Standard bathroom = 1× 2-yd dumpster. Tile is heavy — under the cabinet load to keep weight low.' },
      { text: 'Walk-through + sign-off photo',            required: true },
    ],
  },
  {
    name: 'Commercial strip-out',
    description: 'Office, retail, or tenant improvement — pull the space back to base building.',
    items: [
      { text: 'Pre-job walk with building manager',       required: true,  notes: 'Confirm hours of operation, freight elevator access, fire-watch requirements, after-hours protocol.' },
      { text: 'Verify utility disconnects (HVAC, elec, plumb)', required: true, notes: 'Building engineer must confirm — get a signed lock-out sheet if available.' },
      { text: 'Hoarding + dust barriers',                 required: true,  notes: 'Adjacent tenants need zero dust. Materials: 8-ft hoarding, poly seal, negative-air HEPA if specified.' },
      { text: 'Strip ceiling tiles + grid',               required: false },
      { text: 'Remove millwork, partitions, drywall',     required: true },
      { text: 'Strip flooring (carpet tile, VCT, etc.)',  required: true,  notes: 'VCT pre-1980 may contain asbestos. Test BEFORE demo — see CRM safety module.' },
      { text: 'Disconnect + remove fixtures (lighting, plumbing, HVAC diffusers)', required: true },
      { text: 'Final clean — broom + HEPA vac',           required: true },
      { text: 'Building-manager walk-through + sign-off', required: true },
    ],
  },
  {
    name: 'Bulk-priced job intake',
    description: 'For quotes without itemised scope — capture the detail before the crew rolls.',
    items: [
      { text: 'Read the quote + contract',                required: true,  notes: 'Bulk-priced quotes often skip detail. Pull out what you can: rooms, square footage, special conditions.' },
      { text: 'Write up detailed scope on this work order', required: true, notes: 'GATING STEP. The bookkeeper can\'t open a PO and the crew can\'t execute until this is filled in. Edit the work order description with the room-by-room scope, exclusions, and any client-provides items.' },
      { text: 'Confirm scope with the client (call or site visit)', required: true, notes: 'Bulk-priced jobs are where surprise change-orders happen. Confirm in writing.' },
      { text: 'Photograph existing conditions',           required: true,  notes: 'Especially anywhere outside the obvious scope — bulk pricing assumes everything goes per spec.' },
      { text: 'Order materials + book bin',               required: false },
      { text: 'Brief the crew on what\'s in and out of scope', required: true, notes: 'Bulk pricing means YOU absorb anything not written down. The crew needs to know exactly where the line is.' },
    ],
  },
  {
    name: 'New crew member onboarding',
    description: 'First day on the team — nothing falls through.',
    items: [
      { text: 'Sign safety waiver',                  required: true },
      { text: 'Issue PPE (hard hat, vest, boots)',   required: true },
      { text: 'Tour the yard + facilities',          required: true },
      { text: 'Assign mentor for week one',          required: true },
      { text: 'Add to group chat + staff portal',    required: false },
    ],
  },
  {
    name: 'Daily safety check-in',
    description: 'Before the first swing of the day.',
    items: [
      { text: 'All crew wearing PPE',                required: true },
      { text: 'Tools inspected — no visible damage', required: true },
      { text: 'First aid kit stocked + accessible',  required: true },
      { text: 'Photograph any new site hazards',     required: false, notes: 'Send to the owner if you see anything new since yesterday.' },
      { text: 'Toolbox talk completed',              required: true },
    ],
  },
]

export default function Playbooks() {
  const { profile } = useAuth()
  const companyId = profile?.company_id

  // Templates with items nested (PostgREST relation: items:work_order_template_items(*))
  const [templates,   setTemplates]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [selectedId,  setSelectedId]  = useState(null)
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState(null)

  // The "how it works" banner is dismissable — once the owner has internalised
  // the flow they don't need it taking up space. Persist the choice locally so
  // it doesn't pop back on every reload. Keyed per-company so a user managing
  // multiple workspaces can dismiss it independently in each.
  const dismissKey = companyId ? `playbooks_how_dismissed_${companyId}` : null
  const [showHowItWorks, setShowHowItWorks] = useState(() => {
    if (typeof window === 'undefined' || !dismissKey) return true
    return localStorage.getItem(dismissKey) !== '1'
  })
  function dismissHowItWorks() {
    setShowHowItWorks(false)
    if (typeof window !== 'undefined' && dismissKey) localStorage.setItem(dismissKey, '1')
  }

  // Load on mount + when company changes
  useEffect(() => {
    if (!companyId) return
    loadTemplates()
  }, [companyId])

  async function loadTemplates() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('work_order_templates')
      .select(`
        id, name, description, archived_at, created_at, updated_at,
        items:work_order_template_items(id, position, text, notes, required, created_at)
      `)
      .eq('company_id', companyId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })

    // PostgREST returns 42P01 / PGRST200 / "schema cache" when the table doesn't
    // exist yet — surface a one-time setup screen pointing to migration 020.
    const tableMissing =
      err?.code === '42P01' ||
      err?.code === 'PGRST200' ||
      err?.message?.toLowerCase().includes('schema cache')

    if (tableMissing) {
      setSetupNeeded(true)
      setLoading(false)
      return
    }

    // Sort items by position so the order in the UI matches what'll spawn on a WO
    const sorted = (data || []).map(t => ({
      ...t,
      items: (t.items || []).slice().sort((a, b) => a.position - b.position),
    }))
    setTemplates(sorted)
    setLoading(false)
  }

  const selected = templates.find(t => t.id === selectedId) || null

  // ── Template-level operations ──────────────────────────────────────────────

  async function createTemplate() {
    setBusy(true); setError(null)
    const { data, error: err } = await supabase
      .from('work_order_templates')
      .insert({ company_id: companyId, name: 'Untitled playbook' })
      .select(`id, name, description, archived_at, created_at, updated_at,
               items:work_order_template_items(id, position, text, notes, required, created_at)`)
      .single()
    setBusy(false)
    if (err) { setError(err.message); return }
    setTemplates(prev => [{ ...data, items: data.items || [] }, ...prev])
    setSelectedId(data.id)
  }

  // Clone a STARTER constant into the database as a real template + items.
  // Two round-trips (template insert, items insert) because the items need
  // the template_id from the first response. If items insert fails we leave
  // the empty template behind rather than rolling back — the owner can either
  // archive it or add steps manually, both of which are one click away.
  async function createFromStarter(starter) {
    setBusy(true); setError(null)
    const { data: tpl, error: tplErr } = await supabase
      .from('work_order_templates')
      .insert({
        company_id:  companyId,
        name:        starter.name,
        description: starter.description ?? null,
      })
      .select('id, name, description, archived_at, created_at, updated_at')
      .single()
    if (tplErr) { setBusy(false); setError(tplErr.message); return }

    const rows = starter.items.map((it, idx) => ({
      template_id: tpl.id,
      position:    idx + 1,
      text:        it.text,
      notes:       it.notes ?? null,
      required:    it.required ?? true,
    }))
    const { data: items, error: itemsErr } = await supabase
      .from('work_order_template_items')
      .insert(rows)
      .select('id, position, text, notes, required, created_at')
    setBusy(false)
    if (itemsErr) {
      setError(itemsErr.message)
      // Re-sync so the empty template still shows up — better than leaving
      // local state out of step with the server.
      loadTemplates()
      return
    }

    const sortedItems = (items || []).slice().sort((a, b) => a.position - b.position)
    setTemplates(prev => [{ ...tpl, items: sortedItems }, ...prev])
    setSelectedId(tpl.id)
  }

  async function updateTemplate(id, patch) {
    // Optimistic — the input is the source of truth while the user types
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const { error: err } = await supabase
      .from('work_order_templates')
      .update(patch)
      .eq('id', id)
    if (err) {
      setError(err.message)
      loadTemplates()  // resync from server on failure
    }
  }

  async function archiveTemplate(id) {
    if (!confirm('Archive this playbook? Existing work orders that used it keep their checklists; new ones can no longer pick it.')) return
    setBusy(true); setError(null)
    const { error: err } = await supabase
      .from('work_order_templates')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    setBusy(false)
    if (err) { setError(err.message); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  // ── Item-level operations ──────────────────────────────────────────────────

  async function addItem(templateId) {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    const nextPosition = template.items.length
      ? Math.max(...template.items.map(i => i.position)) + 1
      : 1
    setBusy(true); setError(null)
    const { data, error: err } = await supabase
      .from('work_order_template_items')
      .insert({ template_id: templateId, position: nextPosition, text: '', required: true })
      .select()
      .single()
    setBusy(false)
    if (err) { setError(err.message); return }
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, items: [...t.items, data] } : t
    ))
  }

  async function updateItem(templateId, itemId, patch) {
    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, ...patch } : i) }
        : t
    ))
    const { error: err } = await supabase
      .from('work_order_template_items')
      .update(patch)
      .eq('id', itemId)
    if (err) {
      setError(err.message)
      loadTemplates()
    }
  }

  async function removeItem(templateId, itemId) {
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, items: t.items.filter(i => i.id !== itemId) } : t
    ))
    const { error: err } = await supabase
      .from('work_order_template_items')
      .delete()
      .eq('id', itemId)
    if (err) { setError(err.message); loadTemplates() }
  }

  // Swap an item with its neighbour. We persist BOTH positions so the order
  // is durable — relying only on local sort means a refresh would lose it.
  async function moveItem(templateId, itemId, direction) {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    const items = template.items
    const idx = items.findIndex(i => i.id === itemId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    const a = items[idx], b = items[swapIdx]

    // Optimistic local swap
    const newItems = items.slice()
    newItems[idx] = { ...a, position: b.position }
    newItems[swapIdx] = { ...b, position: a.position }
    newItems.sort((x, y) => x.position - y.position)
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, items: newItems } : t
    ))

    // Persist — two updates, neither of which can fail independently in a way
    // that matters here. If the second fails we resync from the server.
    const [r1, r2] = await Promise.all([
      supabase.from('work_order_template_items').update({ position: b.position }).eq('id', a.id),
      supabase.from('work_order_template_items').update({ position: a.position }).eq('id', b.id),
    ])
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); loadTemplates() }
  }

  // ── Render branches ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50">
        <div className="bg-ink-900 h-20 animate-pulse" />
        <div className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-12 gap-6">
          <div className="col-span-4 h-96 bg-white rounded-xl animate-pulse shadow-sm" />
          <div className="col-span-8 h-96 bg-white rounded-xl animate-pulse shadow-sm" />
        </div>
      </div>
    )
  }

  if (setupNeeded) {
    return (
      <div className="min-h-screen bg-ink-50">
        <PageHeader />
        <div className="max-w-2xl mx-auto px-8 py-12">
          <div className="bg-white border border-ink-100 rounded-xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-4">🛠️</div>
            <h2 className="text-lg font-bold text-ink-900 mb-2">One-time setup required</h2>
            <p className="text-sm text-ink-500 leading-relaxed">
              Run migration <code className="font-mono text-xs bg-ink-100 px-1.5 py-0.5 rounded">020_work_order_checklists.sql</code> in
              your Supabase SQL Editor, then refresh this page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <PageHeader />

      <div className="max-w-6xl mx-auto px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {showHowItWorks && <HowItWorksBanner onDismiss={dismissHowItWorks} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left pane: list of playbooks ─────────────────────────────── */}
          <aside className={`lg:col-span-4 ${selected && 'hidden lg:block'}`}>
            <div className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">

              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Playbooks <span className="text-ink-400">· {templates.length}</span>
                </h2>
                <button
                  onClick={createTemplate}
                  disabled={busy}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
                >
                  + New
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="px-4 py-5">
                  <p className="text-sm font-semibold text-ink-900 mb-1">
                    Start with a template
                  </p>
                  <p className="text-[11px] text-ink-500 mb-3 leading-relaxed">
                    Clone one of these starters and edit it to match how your
                    team actually works.
                  </p>
                  <div className="space-y-2">
                    {STARTERS.map(s => (
                      <button
                        key={s.name}
                        onClick={() => createFromStarter(s)}
                        disabled={busy}
                        className="w-full text-left p-3 border border-ink-150 hover:border-brand-400 hover:bg-brand-50/40 rounded-lg transition-colors disabled:opacity-50 group"
                      >
                        <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-800">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">
                          {s.items.length} steps · {s.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={createTemplate}
                    disabled={busy}
                    className="mt-3 w-full text-xs font-semibold text-ink-500 hover:text-ink-800 py-2 disabled:opacity-50"
                  >
                    + Start from scratch
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {templates.map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-ink-50 transition-colors ${
                          selectedId === t.id ? 'bg-brand-50' : ''
                        }`}
                      >
                        <p className="text-sm font-semibold text-ink-900 truncate">
                          {t.name || 'Untitled playbook'}
                        </p>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          {t.items.length} step{t.items.length === 1 ? '' : 's'}
                          {t.description && ` · ${t.description.slice(0, 40)}${t.description.length > 40 ? '…' : ''}`}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Hint */}
            <p className="mt-3 text-[11px] text-ink-500 leading-relaxed px-1">
              Each playbook becomes a checklist on the work order. Crew ticks off
              steps as they go — from the office or the staff portal.
            </p>
          </aside>

          {/* ── Right pane: editor ────────────────────────────────────────── */}
          <section className={`lg:col-span-8 ${!selected && 'hidden lg:block'}`}>
            {selected ? (
              <PlaybookEditor
                template={selected}
                onBack={() => setSelectedId(null)}
                onUpdateTemplate={patch => updateTemplate(selected.id, patch)}
                onArchive={() => archiveTemplate(selected.id)}
                onAddItem={() => addItem(selected.id)}
                onUpdateItem={(itemId, patch) => updateItem(selected.id, itemId, patch)}
                onRemoveItem={itemId => removeItem(selected.id, itemId)}
                onMoveItem={(itemId, direction) => moveItem(selected.id, itemId, direction)}
                busy={busy}
              />
            ) : (
              <div className="bg-white border border-dashed border-ink-200 rounded-xl p-10 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6">
                    <rect x="4" y="3" width="16" height="18" rx="2"/>
                    <path d="M8 8h8M8 12h8M8 16h5"/>
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-ink-900 mb-1">
                  Your process library
                </h3>
                <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
                  {templates.length === 0
                    ? 'Pick a starter on the left, or start blank. Each playbook becomes a checklist your crew works through in the field.'
                    : 'Pick a playbook on the left to edit it, or create a new one.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="bg-ink-900 border-b border-ink-800 px-8 py-6">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-0.5">
        Process Library
      </div>
      <h1 className="text-xl font-bold text-white">Playbooks</h1>
      <p className="text-xs text-ink-300 mt-1.5 max-w-2xl leading-relaxed">
        Capture the steps you'd otherwise be explaining over the phone. Build
        a playbook once per repeating job and your crew gets a checklist on
        every work order — no more "what's next?" calls.
      </p>
    </div>
  )
}

/**
 * HowItWorksBanner — three-step visual flow shown above the editor.
 *
 * The user feedback that motivated this: "it's bland and doesn't explain well
 * what it is or how it works." The fix is a single glance-able card that
 * sketches the whole lifecycle (write it down → attach to a WO → crew ticks
 * it off) so a new owner doesn't have to assemble the picture from screens
 * scattered across the app.
 *
 * Dismissable + persisted in localStorage so it doesn't burn space for a
 * power user who already knows the flow.
 */
function HowItWorksBanner({ onDismiss }) {
  return (
    <div className="mb-6 bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          How playbooks work
        </h2>
        <button
          onClick={onDismiss}
          className="text-[11px] font-semibold text-ink-400 hover:text-ink-700"
        >
          Got it — hide
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink-100">
        <HowStep
          n="1"
          title="Write it down once"
          body="List the steps for a job your team does over and over — site walkthrough, demo, daily safety. The order matters; the crew works top to bottom."
        />
        <HowStep
          n="2"
          title="Attach to a work order"
          body="When you create a job on the Board or Roadmap, pick the matching playbook. Its steps copy onto that work order as a fresh checklist."
        />
        <HowStep
          n="3"
          title="Crew ticks it off"
          body="The team taps through the checklist on their phone via the staff portal. You see live progress on the Board — no calls, no nagging."
        />
      </div>
    </div>
  )
}

function HowStep({ n, title, body }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center justify-center">
          {n}
        </span>
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      </div>
      <p className="text-xs text-ink-600 leading-relaxed">{body}</p>
    </div>
  )
}

/**
 * Editor pane — handles name + description (debounced through onUpdateTemplate),
 * the step list with inline edit, reorder via up/down arrows, and required toggle.
 *
 * Inline editing is uncontrolled-on-focus, controlled-on-blur — we update local
 * state during typing (instant feedback) but the optimistic write happens on
 * blur so we're not slamming Supabase for every keystroke.
 */
function PlaybookEditor({
  template,
  onBack,
  onUpdateTemplate,
  onArchive,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  busy,
}) {
  // Local controlled state for the name/description so we can debounce the save
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')

  // Reset local state when a different playbook is selected
  useEffect(() => {
    setName(template.name)
    setDescription(template.description ?? '')
  }, [template.id])

  function commitName() {
    if (name === template.name) return
    onUpdateTemplate({ name: name.trim() || 'Untitled playbook' })
  }
  function commitDescription() {
    if (description === (template.description ?? '')) return
    onUpdateTemplate({ description: description.trim() || null })
  }

  return (
    <div className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-ink-100">
        <button
          onClick={onBack}
          className="lg:hidden mb-2 text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          ← Back to playbooks
        </button>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Playbook name"
          className="w-full text-base font-bold text-ink-900 bg-transparent border-0 px-0 py-0.5 focus:outline-none focus:ring-0 placeholder:text-ink-300"
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={commitDescription}
          placeholder="What this playbook is for (optional)"
          rows={1}
          className="mt-1 w-full text-xs text-ink-600 bg-transparent border-0 px-0 py-0.5 resize-none focus:outline-none focus:ring-0 placeholder:text-ink-400"
        />
      </div>

      {/* Steps */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Steps <span className="text-ink-400">· {template.items.length}</span>
          </h3>
        </div>

        {template.items.length === 0 ? (
          <div className="border border-dashed border-ink-200 rounded-lg p-6 text-center">
            <p className="text-sm text-ink-500 mb-3">No steps yet.</p>
            <button
              onClick={onAddItem}
              disabled={busy}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
            >
              + Add the first step
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {template.items.map((item, idx) => (
              <StepRow
                key={item.id}
                item={item}
                isFirst={idx === 0}
                isLast={idx === template.items.length - 1}
                onUpdate={patch => onUpdateItem(item.id, patch)}
                onRemove={() => onRemoveItem(item.id)}
                onMove={direction => onMoveItem(item.id, direction)}
                busy={busy}
              />
            ))}
          </ul>
        )}

        {template.items.length > 0 && (
          <button
            onClick={onAddItem}
            disabled={busy}
            className="mt-3 w-full border border-dashed border-ink-200 rounded-lg py-2.5 text-sm font-semibold text-ink-500 hover:bg-ink-50 hover:text-ink-700 transition-colors disabled:opacity-50"
          >
            + Add step
          </button>
        )}

        {/* Inline explainer — clarifies what the toggles on each step actually
            mean. Lives inside the editor so it's right where the toggles are,
            not buried in a help page nobody opens. */}
        {template.items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-ink-100 text-[11px] text-ink-500 leading-relaxed">
            <p>
              <span className="font-semibold text-ink-700">Required</span> steps
              get flagged on the work order if the crew tries to close out
              without ticking them.
              {' '}
              <span className="font-semibold text-ink-700">Notes</span> show
              under each step in the crew's checklist — use them for the "why"
              behind a step or any gotchas to watch for.
            </p>
          </div>
        )}
      </div>

      {/* ── Crew preview ────────────────────────────────────────────────────
          The single biggest source of "I don't get the benefit" feedback was
          that the editor shows the OWNER's input view but nothing about what
          the CREW will actually see. Without a visible payoff on this page,
          the owner has to imagine the lifecycle.

          This panel renders the playbook exactly as the staff portal will
          paint it on the crew's phone — progress bar, checkboxes, "REQ" badges,
          done strikethrough. Tapping is local-only (resets on playbook change)
          so the owner can FEEL what the crew feels without polluting real data.
          Matches the StaffPortal styling so what they see here is what they ship. */}
      <CrewPreview items={template.items} />

      {/* Footer — actions */}
      <div className="px-5 py-3 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between flex-wrap gap-2">
        {/* Bridge to the place the playbook actually gets used. Without this
            the owner has to remember to go to /board, click +New, AND remember
            to pick the right playbook in the dropdown — too many steps to
            close the loop. Query param is honoured by Board.jsx's existing
            search-param handler (same pattern Roadmap uses for ms_id). */}
        <Link
          to={`/board?playbook_id=${template.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          Use this playbook on a new work order →
        </Link>
        <button
          onClick={onArchive}
          disabled={busy}
          className="text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-50"
        >
          Archive playbook
        </button>
      </div>
    </div>
  )
}

/**
 * CrewPreview — what the field crew will see on their phone.
 *
 * Mirrors the visual language of the staff portal's checklist (StaffPortal.jsx):
 * progress bar across the top, "Checklist · X of Y" header, amber "N required
 * left" badge, large tappable rows with custom checkbox, green-when-done state,
 * "REQ" badge on required+unchecked steps, notes shown below.
 *
 * Tapping is purely local — the demo state resets every time the underlying
 * items list changes (different playbook selected, step added/removed) so the
 * preview never lies about what the real crew has actually done.
 */
function CrewPreview({ items }) {
  const [demoChecked, setDemoChecked] = useState(() => new Set())

  // Reset the local "what the owner toy-ticked" set whenever the underlying
  // step list changes. Keying off the joined IDs covers add/remove/reorder.
  const itemsKey = items.map(i => i.id).join('|')
  useEffect(() => {
    setDemoChecked(new Set())
  }, [itemsKey])

  if (items.length === 0) {
    return (
      <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500 mb-2">
          Preview · what your crew sees
        </h3>
        <div className="border border-dashed border-ink-200 rounded-lg p-5 text-center bg-white">
          <p className="text-xs text-ink-500">
            Add a step above and you'll see exactly what the crew sees on their phone.
          </p>
        </div>
      </div>
    )
  }

  function toggle(id) {
    setDemoChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const doneCount    = items.filter(i => demoChecked.has(i.id)).length
  const requiredLeft = items.filter(i => i.required && !demoChecked.has(i.id)).length
  const pct          = items.length ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          Preview · what your crew sees
        </h3>
        <span className="text-[10px] text-ink-400 font-medium italic">
          Tap to try — won't save
        </span>
      </div>

      {/* The checklist itself, styled to match StaffPortal's renderer. */}
      <div className="bg-white border border-ink-200 rounded-xl p-4 shadow-sm">
        {/* Header: count + required badge */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-ink-900">
            Checklist <span className="text-ink-400">· {doneCount} of {items.length}</span>
          </p>
          {requiredLeft > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
              {requiredLeft} required left
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Items */}
        <ul className="space-y-1.5">
          {items.map(item => {
            const isDone = demoChecked.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isDone ? 'bg-emerald-50 hover:bg-emerald-100/70' : 'bg-white hover:bg-ink-50'
                  }`}
                >
                  {/* Custom checkbox — matches StaffPortal's size + colour */}
                  <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-ink-300'
                  }`}>
                    {isDone && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={`text-sm leading-snug ${isDone ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
                        {item.text || <span className="italic text-ink-400">(unnamed step)</span>}
                      </p>
                      {item.required && !isDone && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 tracking-wide flex-shrink-0">
                          REQ
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-2 text-[10px] text-ink-400 leading-relaxed">
        On the real work order, ticks save instantly and you see live progress
        on the Board.
      </p>
    </div>
  )
}

function StepRow({ item, isFirst, isLast, onUpdate, onRemove, onMove, busy }) {
  const [text, setText] = useState(item.text)
  const [notes, setNotes] = useState(item.notes ?? '')
  const [showNotes, setShowNotes] = useState(!!item.notes)

  // Reset local state if the item changes from underneath (reorder, etc.)
  useEffect(() => { setText(item.text);   }, [item.id, item.text])
  useEffect(() => { setNotes(item.notes ?? '') }, [item.id, item.notes])

  function commitText() {
    if (text === item.text) return
    onUpdate({ text: text.trim() })
  }
  function commitNotes() {
    if (notes === (item.notes ?? '')) return
    onUpdate({ notes: notes.trim() || null })
  }

  return (
    <li className="bg-white border border-ink-150 rounded-lg p-3">
      <div className="flex items-start gap-2">
        {/* Reorder arrows — simpler than DnD for a desktop-first owner UI */}
        <div className="flex flex-col gap-0.5 pt-0.5">
          <button
            onClick={() => onMove('up')}
            disabled={isFirst || busy}
            className="w-5 h-5 flex items-center justify-center text-ink-400 hover:text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isLast || busy}
            className="w-5 h-5 flex items-center justify-center text-ink-400 hover:text-ink-700 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        {/* Step body */}
        <div className="flex-1 min-w-0">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Step description"
            className="w-full text-sm text-ink-900 bg-transparent border-0 px-0 py-0.5 focus:outline-none focus:ring-0 placeholder:text-ink-300"
          />

          {showNotes ? (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={commitNotes}
              placeholder="Optional notes shown under the step"
              rows={2}
              className="mt-1 w-full text-xs text-ink-600 bg-ink-50 border border-ink-100 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-300 placeholder:text-ink-400 resize-y"
            />
          ) : (
            <button
              onClick={() => setShowNotes(true)}
              className="mt-0.5 text-[11px] text-ink-500 hover:text-ink-700 font-medium"
            >
              + Add notes
            </button>
          )}

          {/* Required toggle + delete — under the step body, low-emphasis */}
          <div className="flex items-center gap-3 mt-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={item.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-3.5 h-3.5 rounded text-brand-600 focus:ring-brand-400 border-ink-300"
              />
              <span className="text-[11px] text-ink-500 font-medium select-none">Required</span>
            </label>
            <button
              onClick={onRemove}
              disabled={busy}
              className="text-[11px] font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
