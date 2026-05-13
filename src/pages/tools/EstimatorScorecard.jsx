import CRMUpsellCard from '../../components/marketing/CRMUpsellCard'

/**
 * /tools/estimator-scorecard — coming-soon / CRM-required preview.
 *
 * Once the CRM is connected, this page produces per-estimator pattern
 * analysis: win rate by scope, where each person consistently under-bids
 * or over-bids, and coaching opportunities backed by 12+ months of bids.
 */
export default function EstimatorScorecard() {
  return (
    <CRMUpsellCard
      toolId="estimator-scorecard"
      toolName="Estimator Scorecard"
      toolIcon="🎯"
      tagline="Win rate, bid accuracy, and what each estimator is sharpest at."
      whatItDoes={[
        'Per-estimator: win rate, average margin won at, total $ quoted',
        'Where each person consistently under-bids or over-bids (by scope and SF band)',
        'Patterns the AI surfaces from 12+ months of your bid history',
        'Concrete coaching prompts — not just numbers',
        'Tells you who to assign the next bid to based on scope fit',
      ]}
      sampleOutput="Kristina — 32% win rate (team avg 24%). Strong on demo <2k SF (won 8 of last 12). Under-bids hazmat by 14% on average — the last three hazmat bids she won landed under 9% margin. Send her the next small-demo invite; pair her with a senior estimator on hazmat bids over $200k."
    />
  )
}
