import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * CreditFacilitiesSection — what the business can draw on, and what it owes
 * but has not yet paid.
 *
 * Stored on `business_profiles.financial_settings` (JSONB) so Solomon can
 * factor liquidity into cash-flow advice without re-asking each session.
 *
 * ⭐ REMITTANCES LIVE HERE TOO, and they belong here more than anywhere else:
 * the GST/HST a business has collected and the deductions withheld from payroll
 * sit in the bank account looking exactly like working capital. A liquidity
 * screen that shows an overdraft facility but not the money that is already
 * spoken for is telling half the story.
 *
 * The prompt-only version of this did not hold. Solomon reliably raises
 * remittances when he RUNS the cash-flow tool, and reliably forgot when the
 * owner just asked "I've got 60k, can I afford the hire?" — the instruction was
 * competing with twenty thousand characters of other instruction and losing.
 * Stored input beats remembered instruction: now he has the numbers rather than
 * having to remember to ask for them.
 */

const EMPTY = {
  overdraft_limit: '',
  overdraft_used:  '',
  cc_limit:        '',
  cc_balance:      '',
  gst_frequency:   '',
  gst_typical:     '',
  payroll_deductions_frequency: '',
  payroll_deductions_typical:   '',
}

const FREQUENCIES = [
  { value: '',          label: 'Not sure / not applicable' },
  { value: 'monthly',   label: 'Monthly'   },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually',  label: 'Annually'  },
]

export default function CreditFacilitiesSection({ companyId }) {
  const [fields,   setFields]   = useState(EMPTY)
  const [initial,  setInitial]  = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)     // { tone: 'ok'|'err', text }
  // ⚠️ The whole stored object, kept so save can MERGE rather than replace.
  // This used to write only the four fields it knew about, which silently
  // dropped anything else living on financial_settings — a bug that costs
  // nothing until the moment a second thing is stored there, and then quietly
  // deletes it on the next unrelated save.
  const [stored,   setStored]   = useState({})

  useEffect(() => {
    if (!companyId) return
    ;(async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('financial_settings')
        .eq('company_id', companyId)
        .maybeSingle()
      const fs = data?.financial_settings ?? {}
      const hydrated = {
        overdraft_limit: fs.overdraft_limit ?? '',
        overdraft_used:  fs.overdraft_used  ?? '',
        cc_limit:        fs.cc_limit        ?? '',
        cc_balance:      fs.cc_balance      ?? '',
        gst_frequency:   fs.gst_frequency   ?? '',
        gst_typical:     fs.gst_typical     ?? '',
        payroll_deductions_frequency: fs.payroll_deductions_frequency ?? '',
        payroll_deductions_typical:   fs.payroll_deductions_typical   ?? '',
      }
      setStored(fs)
      setFields(hydrated)
      setInitial(hydrated)
    })()
  }, [companyId])

  const isDirty = JSON.stringify(fields) !== JSON.stringify(initial)

  function set(key, val) {
    setFields(f => ({ ...f, [key]: val }))
    setMsg(null)
  }

  async function handleSave() {
    if (!isDirty) return
    setSaving(true); setMsg(null)
    try {
      const patch = {
        ...stored,
        overdraft_limit: parseMoney(fields.overdraft_limit),
        overdraft_used:  parseMoney(fields.overdraft_used),
        cc_limit:        parseMoney(fields.cc_limit),
        cc_balance:      parseMoney(fields.cc_balance),
        gst_frequency:   fields.gst_frequency || null,
        gst_typical:     parseMoney(fields.gst_typical),
        payroll_deductions_frequency: fields.payroll_deductions_frequency || null,
        payroll_deductions_typical:   parseMoney(fields.payroll_deductions_typical),
      }
      const { error } = await supabase
        .from('business_profiles')
        .update({ financial_settings: patch })
        .eq('company_id', companyId)
      if (error) throw new Error(error.message)
      setStored(patch)
      setInitial(fields)
      setMsg({ tone: 'ok', text: 'Saved — Solomon will factor this in from now on.' })
    } catch (err) {
      setMsg({ tone: 'err', text: err.message ?? 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-8 bg-white border border-ink-100 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Credit &amp; liquidity</h2>
        <p className="text-sm text-ink-400 mt-0.5">
          Stored once — Solomon factors this into cash flow, financial advice, and planning automatically.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <CreditField label="Overdraft / credit line limit" hint="Total facility your bank has approved." value={fields.overdraft_limit} onChange={v => set('overdraft_limit', v)} />
        <CreditField label="Overdraft currently drawn"     hint="How much of that line is currently used." value={fields.overdraft_used}  onChange={v => set('overdraft_used',  v)} />
        <CreditField label="Business credit card limit"    hint="Combined limit across all business cards." value={fields.cc_limit}        onChange={v => set('cc_limit',        v)} />
        <CreditField label="Credit card balance owing"     hint="Total charged across all cards right now." value={fields.cc_balance}      onChange={v => set('cc_balance',      v)} />
      </div>

      {/* Money already spoken for. Kept visually separate from the facilities
          above because it is the opposite thing: not what you can draw on, but
          what is sitting in the account and is not yours. */}
      <div className="mt-7 pt-6 border-t border-ink-100">
        <h3 className="text-sm font-semibold text-ink-900">Money you hold but owe</h3>
        <p className="text-[12.5px] text-ink-400 mt-0.5 leading-relaxed">
          GST/HST you have collected and deductions withheld from payroll sit in
          the account until you remit them. Telling Solomon roughly what and when
          keeps them out of a balance he might otherwise treat as spendable.
          He will not work out what you owe &mdash; that is your accountant&rsquo;s.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 mt-4">
          <SelectField
            label="GST / HST — how often you remit"
            value={fields.gst_frequency}
            onChange={v => set('gst_frequency', v)}
          />
          <CreditField
            label="Typical GST / HST remittance"
            hint="Roughly what leaves each time. An estimate is fine."
            value={fields.gst_typical}
            onChange={v => set('gst_typical', v)}
          />
          <SelectField
            label="Payroll deductions — how often you remit"
            value={fields.payroll_deductions_frequency}
            onChange={v => set('payroll_deductions_frequency', v)}
          />
          <CreditField
            label="Typical payroll remittance"
            hint="CPP, EI and tax withheld, per remittance."
            value={fields.payroll_deductions_typical}
            onChange={v => set('payroll_deductions_typical', v)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.tone === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
        {!msg && isDirty && <span className="text-sm text-ink-400">Unsaved changes</span>}
      </div>
    </section>
  )
}

function CreditField({ label, hint, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-1.5">{label}</span>
      {hint && <span className="block text-[11px] text-ink-400 mb-1.5 -mt-1">{hint}</span>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="w-full pl-7"
        />
      </div>
    </label>
  )
}

function SelectField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-ink-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full"
      >
        {FREQUENCIES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
    </label>
  )
}

function parseMoney(str) {
  if (!str) return null
  const n = Number(String(str).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}
