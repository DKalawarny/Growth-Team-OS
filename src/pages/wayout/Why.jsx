import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_NAME, WAYOUT_BASE, WAYOUT_INTAKE } from '../../lib/wayout/brand'

/**
 * ⭐⭐ WHY THIS EXISTS — FROM DANIEL'S OWN WORDS (5 Oct 2026). He wrote the
 * reason; at his request ("I might have divulged too much") it was reworded to
 * keep the meaning and leave out his family's details, this is the
 * text he approved. ⚠️ He rejected an added paragraph describing the product
 * ("sounds like a sale, not personal") — show him drafts before adding ANYTHING
 * here. Unsigned, his choice. A founder
 * story someone else wrote is the fastest way for a page like this to read as
 * fake, which is why it sat empty until he wrote it.
 *
 * ⚠️ /why, not /about: one Netlify site serves both domains and /about is
 * Eliv8 OS's page, so on getunstuckmap.com it would have been served Eliv8's
 * prerendered HTML.
 * ⚠️ "What we won't do" is the product's own commitments (terms + privacy),
 * not his voice — kept under its own heading so the two never blur.
 */
export default function Why() {
  return (
    <WayoutShell title={`Why ${WAYOUT_NAME} exists`} wide noindex={false} canonicalPath={`${WAYOUT_BASE}/why`} home>
      <article className="wayout__legal wayout__why">
        <h1>Why {WAYOUT_NAME} exists</h1>

        <p>At some point it dawned on me that what I was working through in my own life is something a lot of people need help with.</p>

        <p>It is easy to get caught up chasing the next thing — more work, more money, more success — and lose sight of why you started. Most of us only learn what really matters by living it, then looking back and saying, “They were right.”</p>

        <p>And for a lot of people, the grind is necessary. You have to build something before you can have the time and freedom you want. That time is not wasted. It is part of the path.</p>

        <p>{WAYOUT_NAME} is for wherever you are on that path. You see where you stand, where you want to be, and the next steps to get there — while building a life that actually holds up once you arrive.</p>

        <p className="wayout__whygoal">My goal is simple: to help people get free of the life they never wanted, or at least make it better.</p>

        <section className="wayout__legalsec">
          <h2>What we won’t do</h2>
          <ul>
            <li>Sell or share what you tell us.</li>
            <li>Pretend to be your financial adviser, lawyer or counsellor. Your plan is a suggestion; every decision stays yours.</li>
            <li>Pretend there is a person reading your plan.</li>
            <li>Charge you for your plan. It is free, and it is yours to keep.</li>
          </ul>
        </section>

        <p><Link className="wayout__btn wayout__btn--sun" to={WAYOUT_INTAKE}>Start your plan</Link></p>
      </article>
    </WayoutShell>
  )
}
