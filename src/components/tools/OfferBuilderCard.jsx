/**
 * OfferBuilderCard — pure presentation component for the JSON produced by
 * OFFER_BUILDER_PROMPT.
 *
 * Used in two places:
 *   - /tools/offer-builder (right after Claude returns)
 *   - /documents           (when opening a saved offer)
 *
 * Field names here MUST match the JSON shape the prompt returns. If the
 * prompt changes, update this file in the same commit.
 *
 * Visual hierarchy (intentional):
 *   1. Headline + 1-liner positioning     — the "what this is"
 *   2. Who it's for + Outcome             — why a buyer should care
 *   3. Scope included / excluded          — the contract boundary
 *   4. Pricing card (tiers or flat)       — the money
 *   5. Objection handlers                 — sales-call prep
 *
 * Tier logic:
 *   The prompt returns either 0 or exactly 3 tiers. We render tiers as a
 *   three-up grid when present and highlight the middle "Standard" tier as
 *   the default pick (buyers gravitate to the middle anchor). When tiers
 *   is empty we render a single-price card.
 */

import ToolDisclaimer from './ToolDisclaimer'

export default function OfferBuilderCard({ data }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-gray-500">No content saved.</p>
  }

  const {
    headline,
    who_its_for,
    outcome,
    scope_included = [],
    scope_excluded = [],
    pricing,
    objection_handlers = [],
    positioning_1liner,
  } = data

  return (
    <div className="space-y-6">
      {/* Headline + positioning */}
      {(headline || positioning_1liner) && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
          {headline && (
            <h3 className="text-lg font-semibold text-gray-900 leading-snug">
              {headline}
            </h3>
          )}
          {positioning_1liner && (
            <p className="text-sm text-brand-800 mt-2 italic">
              “{positioning_1liner}”
            </p>
          )}
        </div>
      )}

      {/* Who it's for + outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {who_its_for && (
          <Section title="Who it's for">
            <p className="text-sm text-gray-800 leading-relaxed">{who_its_for}</p>
          </Section>
        )}
        {outcome && (
          <Section title="The outcome">
            <p className="text-sm text-gray-800 leading-relaxed">{outcome}</p>
          </Section>
        )}
      </div>

      {/* Scope */}
      {(scope_included.length > 0 || scope_excluded.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scope_included.length > 0 && (
            <ScopeList
              tone="green"
              title="What's included"
              icon="✓"
              items={scope_included}
            />
          )}
          {scope_excluded.length > 0 && (
            <ScopeList
              tone="gray"
              title="Not included"
              icon="–"
              hint="Say this upfront so nobody's surprised."
              items={scope_excluded}
            />
          )}
        </div>
      )}

      {/* Pricing */}
      {pricing && <PricingBlock pricing={pricing} />}

      {/* Objection handlers */}
      {objection_handlers.length > 0 && (
        <Section
          title="When customers push back on price"
          hint="Word-for-word responses for the most common objections. Use these in quotes, discovery calls, or follow-up emails."
        >
          <div className="space-y-2">
            {objection_handlers.map((o, i) => (
              <ObjectionRow key={i} objection={o.objection} response={o.response} />
            ))}
          </div>
        </Section>
      )}

      <ToolDisclaimer toolId="offer-builder" />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-blocks
// ----------------------------------------------------------------------------

function PricingBlock({ pricing }) {
  const tiers = Array.isArray(pricing.tiers) ? pricing.tiers : []
  const hasTiers = tiers.length === 3
  return (
    <Section title="Pricing">
      {hasTiers ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tiers.map((t, i) => (
            <TierCard key={i} tier={t} highlighted={i === 1} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
          <div className="text-2xl font-bold text-gray-900">
            {pricing.recommended || '—'}
          </div>
          {pricing.payment_terms && (
            <div className="text-xs uppercase tracking-wide text-brand-700 mt-1">
              {pricing.payment_terms}
            </div>
          )}
        </div>
      )}

      {pricing.rationale && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Why this price
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{pricing.rationale}</p>
        </div>
      )}

      {hasTiers && pricing.payment_terms && (
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-medium">Payment:</span> {pricing.payment_terms}
        </p>
      )}
    </Section>
  )
}

/**
 * TierCard — one pricing tier. The middle tier is visually emphasised so
 * the eye lands on it first; this mirrors the "most popular" convention
 * every SaaS pricing page uses for a good reason (buyers anchor to the
 * middle).
 */
function TierCard({ tier, highlighted }) {
  const tone = highlighted
    ? 'border-brand-500 bg-white shadow-sm ring-1 ring-brand-500/20'
    : 'border-gray-200 bg-white'
  return (
    <div className={`relative rounded-xl border p-4 ${tone}`}>
      {highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide font-semibold bg-brand-600 text-white px-2 py-0.5 rounded-full">
          Most popular
        </div>
      )}
      <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {tier.name || 'Tier'}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-1 leading-none">
        {tier.price || '—'}
      </div>
      {tier.for && (
        <div className="text-xs text-gray-500 mt-2 italic">{tier.for}</div>
      )}
      {tier.includes_short && (
        <div className="text-sm text-gray-800 mt-3 leading-relaxed">
          {tier.includes_short}
        </div>
      )}
    </div>
  )
}

function ObjectionRow({ objection, response }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mr-2">They say:</span>
        <span className="text-sm font-medium text-gray-800">"{objection}"</span>
      </div>
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600 mr-2">You say:</span>
        <span className="text-sm text-gray-700 leading-relaxed">{response}</span>
      </div>
    </div>
  )
}

function ScopeList({ tone, title, icon, hint, items }) {
  const t = scopeTones[tone] ?? scopeTones.gray
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-4`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">
        {title}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-800">
            <span className={`flex-shrink-0 font-semibold ${t.iconText}`} aria-hidden>
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const scopeTones = {
  green: { bg: 'bg-green-50', border: 'border-green-200', iconText: 'text-green-600' },
  gray:  { bg: 'bg-gray-50',  border: 'border-gray-200',  iconText: 'text-gray-400' },
}

function Section({ title, hint, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {title}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  )
}
