import CRMUpsellCard from '../../components/marketing/CRMUpsellCard'

/**
 * /tools/pipeline-to-hire — coming-soon / CRM-required preview.
 *
 * Once the CRM is connected, this page reads awarded + probable pipeline by
 * scope, crosses with current crew capacity and labour rates, and tells the
 * owner when they'll cross capacity and when to start interviewing — factoring
 * their typical hire-and-ramp lead time. Until then, this is the upsell card.
 */
export default function PipelineToHire() {
  return (
    <CRMUpsellCard
      toolId="pipeline-to-hire"
      toolName="Pipeline-to-Hire"
      toolIcon="📅"
      tagline="Hire the right person, the right week — based on the work you've already won."
      whatItDoes={[
        'Reads awarded + probable pipeline broken out by your scope tags',
        'Crosses with current crew capacity and labour rates from your CRM',
        'Tells you the week your backlog will exceed crew capacity',
        'Counts back your typical hire-and-ramp time to flag when to start interviewing',
        'Re-runs automatically as quotes are won, lost, or move stage',
      ]}
      sampleOutput="Demo work hits 80% of crew capacity in the week of August 11 (probable pipeline + your conversion rate). At your 5-week hire-and-ramp window, you should start interviewing a Demo Foreman by the week of June 30 to be ready in time. If you'd rather not hire, the alternative is to walk away from ~$120k of probable demo work in Q3."
    />
  )
}
