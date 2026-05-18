import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * CreditFacilitiesSection — overdraft + credit-card limits and balances.
 *
 * Stored on `business_profiles.financial_settings` (JSONB) so Claude can
 * factor liquidity into cash-flow advice without re-asking each session.
 */

const EMPTY = {
  overdraft_limit: '',
  overdraft_used:  '',
  cc_limit:        '',
  cc_balance:      '',
}

export default function CreditFacilitiesSection({ companyId }) {
  const [fields,   setFields]   = useState(EMPTY)
  const [initial,  setInitial]  = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)     // { tone: 'ok'|'err', text }

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
      }
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
        overdraft_limit: parseMoney(fields.overdraft_limit),
        overdraft_used:  parseMoney(fields.overdraft_used),
        cc_limit:        parseMoney(fields.cc_limit),
        cc_balance:      parseMoney(fields.cc_balance),
      }
      const { error } = await supabase
        .from('business_profiles')
        .update({ financial_settings: patch })
        .eq('company_id', companyId)
      if (error) throw new Error(error.message)
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

function parseMoney(str) {
  if (!str) return null
  const n = Number(String(str).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}
