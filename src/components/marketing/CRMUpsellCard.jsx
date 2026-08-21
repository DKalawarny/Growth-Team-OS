import { Link } from 'react-router-dom'
import ToolDisclaimer from '../tools/ToolDisclaimer'

/**
 * CRMUpsellCard — preview state for cross-system tools that need the CRM.
 *
 * These tools (Pipeline-to-Hire, Estimator/Foreman scorecards, Job Autopsy)
 * are useless without operational data — quotes, projects, time entries,
 * invoices. Until the CRM is connected, the page renders this card instead
 * of an empty form. The card explains what the tool will do once linked,
 * shows a sample output so the value is concrete, and routes to /crm for
 * the owner to learn about / buy the CRM.
 *
 * Why a single component (not a per-tool layout):
 *   The four tools share the same shape — name, what-it-shows, sample
 *   output, disclaimer. One component keeps copy + layout consistent and
 *   makes adding a fifth tool a 30-second change.
 *
 * Props are intentionally string/array — no business logic in here.
 *
 * Once the CRM connector ships, each tool page wraps its real form/result
 * in a `<CRMRequiredGate>` that decides whether to render the live tool or
 * this card based on `business_profiles.crm_connected`. For now every user
 * sees the card.
 */
export default function CRMUpsellCard({
  toolId,
  toolName,
  toolIcon,
  tagline,
  whatItDoes,
  sampleOutput,
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden>{toolIcon}</span>
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{toolName}</h1>
            <p className="text-sm text-ink-600 mt-1 max-w-xl">{tagline}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-800 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-full whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          Needs ProSuite
        </span>
      </div>

      {/* What it shows */}
      <div className="bg-white border border-ink-100 rounded-xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">
          What this tool will show you
        </h2>
        <ul className="space-y-2">
          {whatItDoes.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-800">
              <span className="text-brand-600 flex-shrink-0">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Sample output */}
      <div className="bg-ink-50 border border-ink-100 rounded-xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">
          Sample output (illustrative — not your data)
        </h2>
        <p className="text-sm text-ink-800 leading-relaxed italic">
          {sampleOutput}
        </p>
      </div>

      {/* CTA card */}
      <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-ink-900 mb-2">
          This tool requires ProSuite
        </h2>
        <p className="text-sm text-ink-700 leading-relaxed mb-4 max-w-xl">
          ProSuite is where your jobs, quotes, and crew hours live. Without
          that data, there's nothing here for the AI to analyze. Add ProSuite
          to your GrowthOS plan and this tool starts producing real,
          decision-ready output.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="mailto:support@leadeos.com?subject=Interested%20in%20ProSuite"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors"
          >
            Get ProSuite →
          </a>
          <button
            type="button"
            disabled
            title="Coming soon — connector ships when ProSuite is linked to GrowthOS."
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 bg-white border border-ink-200 px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
          >
            I already have it — connect
          </button>
        </div>
      </div>

      <ToolDisclaimer toolId={toolId} />
    </div>
  )
}
