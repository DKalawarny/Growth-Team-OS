import CRMUpsellCard from '../../components/marketing/CRMUpsellCard'

/**
 * /tools/job-autopsy — coming-soon / CRM-required preview.
 *
 * Once a project closes out in the CRM with full actuals (materials, labour,
 * equipment, disposal, trucking, change orders), this page produces a
 * line-item diff between quoted and actual — and a one-paragraph summary
 * of where the margin went, plus one lesson the next quote should bake in.
 */
export default function JobAutopsy() {
  return (
    <CRMUpsellCard
      toolId="job-autopsy"
      toolName="Job Autopsy"
      toolIcon="🔍"
      tagline="Why this job's margin came in below quote — line by line."
      whatItDoes={[
        'For a closed project: quoted vs actual, line by line',
        'Breaks the variance into materials, labour, equipment, disposal, trucking, change orders',
        'A one-paragraph summary of where the margin went',
        'One concrete lesson the next quote should bake in',
        'Pattern detection across closed jobs — recurring leak vs one-off',
      ]}
      sampleOutput="Embassy Inn — quoted 18% margin, actuals came in at 11%. Where it went: labour +$8k (single crew ran 22% over hours, no change order to absorb it), disposal +$3k (extra haul-out outside scoped tonnage), one unbilled scope addition +$5k. Lesson for next quote: scope hazmat removal in tonnage bands, not flat fee; build a mid-project change-order checkpoint into the PM workflow so additions get billed before they get done."
    />
  )
}
