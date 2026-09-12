import { useEffect, useState } from 'react'
import WayoutShell from './WayoutShell'
import Playbook from './Playbook'
import { generatePlaybook } from '../../lib/wayout/session'

/**
 * 🔴 DEV ONLY — the test of whether the second product is worth anything.
 *
 * It calls the real model with the real prompt against a full, realistic set of
 * answers, and renders whatever comes back. Nothing is saved and no payment is
 * involved: the question this route exists to answer is not "does the plumbing
 * work", it is "does this read like something a person would pay for, or like a
 * blog post" — and only real output can answer that.
 *
 * ⚠️ It needs a signed-in session, because the model runs behind the same
 * authenticated proxy as everything else. Signed out, it says so rather than
 * failing silently.
 */

// The Nanaimo example the design reference uses, filled out as a real intake
// would be — including the two fields that matter most here: three neighbours
// who have already paid him, and four hours a week.
const SAMPLE_ANSWERS = {
  out: 'Not clocking in for someone else. Fridays with my kids.',
  immovables: [{ key: 'custody', label: 'Shared custody', custom: false }],
  immovablesNote: 'The custody is fixed. The lease I have never really questioned.',
  relationship: 'single',
  kidsAges: [{ key: '5-11', label: '5–11' }],
  peopleNote: 'My mum thinks I should stay at the warehouse for the pension.',
  assets: [
    { key: 'truck', label: 'Truck or van', custom: false },
    { key: 'pressure-washer', label: 'Pressure washer', custom: false },
    { key: 'weekends', label: 'Weekends', custom: false },
  ],
  askedFor: 'Fixing stuff. Hauling. I rebuilt my uncle’s fence last summer.',
  paidFor: 'Two hundred bucks to clear a guy’s yard. My neighbour paid me to wash his driveway twice.',
  takeHome: '3400',
  householdTakeHome: '',
  savings: '900',
  mustPay: '2650',
  discretionary: [
    { key: 'eating-out', label: 'Eating out', custom: false },
    { key: 'subscriptions', label: 'Subscriptions', custom: false },
  ],
  fiveYearTest: 'The truck payment is the stupid one. I will not remember the takeaway.',
  hoursPerWeek: '0-5',
  alreadyTried: 'Tried food delivery for a month. Made about $9 an hour after gas and quit.',
  tradeRank: ['comfort', 'status', 'space', 'savings', 'stability', 'time-with-people', 'health', 'community', 'family-proximity'],
  yearShape: 'steady',
  atStake: 'time',
  horizon: '1y',
  locationText: 'Nanaimo, BC',
  seasonNote: 'Wet winters, dry from May. Lots of retired people with driveways.',
  worstVersion: 'Still at the warehouse but with weekends that are mine.',
  goalType: 'independent',
  tuesday: 'Up at seven, drop the kids, work my own day, done by four.',
  fromToward: 'Running from being told when I can see my kids. Toward picking my own week.',
  faith: [], faithNote: '', health: [], healthNote: '',
  story: 'I left school at sixteen and I think that is why I keep waiting for someone to tell me I am allowed to do this.',
}

const SAMPLE_MOVE = {
  order: 1,
  libraryKey: 'pressure-washing',
  outdoor: true,
  title: 'Pressure wash, door to door',
  when: 'This Saturday.',
  detail: 'Aim for three jobs. Runs April to October.',
  gate: 'three people have paid you',
}

const SAMPLE_MAP = {
  headline: 'Out of the warehouse in twelve months.',
  moves: [SAMPLE_MOVE],
  cut: [{ label: 'Delivery driving', why: 'You already tried it and made $9 an hour.' }],
}

export default function PreviewPlaybook() {
  const [play, setPlay] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    generatePlaybook({ answers: SAMPLE_ANSWERS, map: SAMPLE_MAP, move: SAMPLE_MOVE })
      .then(p => { if (!cancelled) setPlay(p) })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <WayoutShell title="This week">
        <p className="wayout__q">Couldn’t generate it.</p>
        <p className="wayout__lead">{error}</p>
        <p className="wayout__hint">
          If that says something about auth, this needs a signed-in window rather
          than a private one — the model runs behind the same authenticated proxy
          as the rest of the product.
        </p>
      </WayoutShell>
    )
  }

  if (!play) {
    return (
      <WayoutShell title="This week">
        <p className="wayout__q">Writing it.</p>
        <p className="wayout__lead">Real output from the real prompt — about twenty seconds.</p>
      </WayoutShell>
    )
  }

  return <Playbook play={play} index={1} />
}
