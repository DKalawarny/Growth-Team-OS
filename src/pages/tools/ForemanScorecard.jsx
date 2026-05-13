import CRMUpsellCard from '../../components/marketing/CRMUpsellCard'

/**
 * /tools/foreman-scorecard — coming-soon / CRM-required preview.
 *
 * Once the CRM has time tracking and project actuals, this page produces
 * per-foreman labour variance and on-time delivery across recent jobs —
 * the kind of pattern that's invisible until you cross planned vs actual
 * hours by person across many projects.
 */
export default function ForemanScorecard() {
  return (
    <CRMUpsellCard
      toolId="foreman-scorecard"
      toolName="Foreman Scorecard"
      toolIcon="👷"
      tagline="Labour variance and on-time delivery, by foreman."
      whatItDoes={[
        'Per-foreman: hours-vs-budget, on-time finish rate, $ margin delivered',
        'Where things go sideways — by scope, crew size, job type',
        'Crew composition patterns that perform vs underperform',
        'Who to assign the next big job to based on scope fit',
        'Coaching conversations backed by 18 months of data',
      ]}
      sampleOutput="Brad — 12% over labour budget across 8 projects, 60% on-time finish. Sarah — 4% under budget, 90% on-time, same scope mix. Brad's variance is concentrated in jobs over 3 weeks duration; under 2 weeks he's at +3%. For the Casman demo (5 weeks), send Sarah's crew. Worth a coaching conversation with Brad about long-job scope discipline."
    />
  )
}
