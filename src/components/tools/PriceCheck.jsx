import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AMOUNTS_EMBED, withAmounts } from '../../lib/jobAmounts'
import { checkPrice, priceForMargin, pastMargin } from '../../lib/priceCheck'

/**
 * Quick price check.
 *
 * ⚠️ 10 Oct, Daniel on the old offer builder: "there is no context to give
 * pricing, it's not a product." It drew three priced tiers with no labour cost,
 * no hours and no margin behind them. Then, on the rebuild: "diminish it a bit
 * and use it as a quick check. It's not quoting software, but it can be used to
 * check against Solomon to see if it makes sense for the business."
 *
 * So this is arithmetic on the owner's OWN four numbers, set beside what his
 * finished jobs actually made, with one door to Solomon. It does not store
 * quotes, send them, or suggest a price out of the air.
 */
const money = n => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`

function Label({ children, hint }) {
  return (
      <span className="block mb-1">
        <span className="block text-[12.5px] font-semibold text-ink-700">{children}</span>
        {hint && <span className="block text-[11.5px] text-ink-400 leading-snug">{hint}</span>}
      </span>
  )
}

export default function PriceCheck({ companyId }) {
  const [f, setF] = useState({ what: '', price: '', hours: '', hourlyCost: '', materials: '', target: '' })
  const [jobs, setJobs] = useState([])
  const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }))

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    supabase.from('work_orders').select(`id, status, ${AMOUNTS_EMBED}`).eq('company_id', companyId)
      .then(({ data }) => { if (!cancelled) setJobs(withAmounts(data)) })
    return () => { cancelled = true }
  }, [companyId])

  const past   = useMemo(() => pastMargin(jobs), [jobs])
  const r      = checkPrice(f)
  const target = f.target !== '' ? parseFloat(f.target) : (past?.marginPct ?? null)
  const needed = r && target != null ? priceForMargin(r.cost, target) : null

  const ask = r ? [
    `I am thinking of charging ${money(r.price)}${f.what.trim() ? ` for ${f.what.trim()}` : ''}.`,
    `My direct cost is about ${money(r.cost)} (${f.hours} hours at $${f.hourlyCost} an hour${parseFloat(f.materials) > 0 ? `, plus $${f.materials} in materials` : ''}), which leaves ${money(r.profit)}, a ${r.marginPct}% margin.`,
    past ? `My finished jobs have averaged ${past.marginPct}%.` : '',
    'Does that price make sense for my business? What am I not seeing?',
  ].filter(Boolean).join(' ') : ''

  const inputCls = 'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300'
  return (
    <section className="bg-white border border-ink-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 md:px-6 py-4 border-b border-ink-100">
        <h2 className="text-base font-bold text-ink-900">Quick price check</h2>
        <p className="text-[13px] text-ink-500 mt-0.5 max-w-2xl leading-relaxed">
          Enter your price and what the job costs you. You see what you keep and how that compares with the jobs
          you have finished. Nothing is saved or sent.
        </p>
      </div>

      <div className="px-5 md:px-6 py-5 grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block">
            <Label>What is the job? <span className="font-normal text-ink-400">(optional)</span></Label>
            <input value={f.what} onChange={set('what')} placeholder="Weekly maintenance, Oakridge commercial" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Label hint="What you would charge">Price</Label>
              <input value={f.price} onChange={set('price')} inputMode="decimal" placeholder="1900" className={inputCls} />
            </label>
            <label className="block">
              <Label hint="All crew hours added up">Hours on the job</Label>
              <input value={f.hours} onChange={set('hours')} inputMode="decimal" placeholder="20" className={inputCls} />
            </label>
            <label className="block">
              <Label hint="Wage plus what it costs you on top">Labour cost per hour</Label>
              <input value={f.hourlyCost} onChange={set('hourlyCost')} inputMode="decimal" placeholder="45" className={inputCls} />
            </label>
            <label className="block">
              <Label hint="Anything bought for this job">Materials and other</Label>
              <input value={f.materials} onChange={set('materials')} inputMode="decimal" placeholder="250" className={inputCls} />
            </label>
          </div>
          <label className="block max-w-[220px]">
            <Label hint={past ? `Leave empty to use your own average, ${past.marginPct}%` : 'The margin you want to hold, as a percent'}>Margin you are aiming for</Label>
            <input value={f.target} onChange={set('target')} inputMode="decimal" placeholder={past ? String(past.marginPct) : '40'} className={inputCls} />
          </label>
        </div>

        <div className="rounded-xl bg-ink-50 border border-ink-100 p-4 md:p-5 flex flex-col gap-3">
          {!r ? (
            <p className="text-sm text-ink-500 leading-relaxed">
              Fill in the price, the hours and the labour cost per hour, and what you keep shows here.
            </p>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">What you keep at {money(r.price)}</p>
                <p className={`text-3xl font-bold tabular-nums mt-1 ${r.profit < 0 ? 'text-red-700' : 'text-ink-900'}`}>
                  {money(r.profit)} <span className="text-lg font-semibold text-ink-500">· {r.marginPct}%</span>
                </p>
                <p className="text-[13px] text-ink-600 mt-1">
                  The job costs you about {money(r.cost)} before overhead.
                  {r.profit < 0 && ' At this price the job loses money before a single overhead is paid.'}
                </p>
              </div>

              <p className="text-[13.5px] text-ink-800 leading-relaxed border-t border-ink-200 pt-3">
                {past
                  ? <>Your {past.count} finished job{past.count === 1 ? '' : 's'} with numbers on {past.count === 1 ? 'it' : 'them'} averaged <span className="font-semibold">{past.marginPct}%</span>. This one is {Math.abs(Math.round((r.marginPct - past.marginPct) * 10) / 10)} points {r.marginPct >= past.marginPct ? 'above' : 'below'} that.</>
                  : <>There is nothing to compare this with yet. Put what a job was invoiced and what it cost on a finished <Link to="/board" className="font-semibold text-brand-700 hover:text-brand-800">task</Link>, and your own average shows here.</>}
              </p>

              {needed != null && (
                <p className="text-[13.5px] text-ink-800 leading-relaxed">
                  To hold <span className="font-semibold">{target}%</span> on this cost, the price would be about <span className="font-semibold">{money(needed)}</span>
                  {needed > r.price ? `, ${money(needed - r.price)} more than you have in mind.` : needed < r.price ? `, so you have ${money(r.price - needed)} of room.` : '.'}
                </p>
              )}

              <Link
                to={`/advisor?ask=${encodeURIComponent(ask)}`}
                className="self-start mt-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
              >
                Ask Solomon if this makes sense
              </Link>
              <p className="text-[11.5px] text-ink-400 leading-snug">
                Solomon reads these numbers against the rest of your business.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
