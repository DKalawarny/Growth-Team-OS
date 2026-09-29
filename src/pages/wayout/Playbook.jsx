import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { Marked } from '../../lib/wayout/marked.jsx'

/**
 * The way out — how to actually do the move you are on.
 *
 * ⚠️ Presentation only. It renders whatever the generator returned and renders
 * nothing it did not: every block below is conditional, because a play-by-play
 * that invents a licensing requirement or a going rate to fill a section is the
 * exact failure the prompt spends most of its length preventing. An empty
 * section is information; a padded one is a lie with a heading on it.
 */
/**
 * ⚠️ `children` AND `wide` EXIST FOR THE SAME REASON, AND BOTH ARE BUG FIXES.
 *
 * 🔴 This component renders its own WayoutShell, so anything the PAGE rendered
 * after it — the ask box, the done button — landed OUTSIDE the card. Daniel saw
 * the result: a white "Ask" button on a white background, invisible, with the
 * whole block floating unstyled below the sheet. It looked like a design
 * problem and it was a nesting one.
 *
 * ⭐ `wide` because this is the densest page in the product and it was running
 * in the narrow column — Daniel: "the way the pages look, it looks like it's
 * meant for mobile". A week of instructions on a desktop should use the desk.
 */
/**
 * ⭐⭐ A HEADING YOU CAN TALK BACK TO. Daniel: "each section should have a
 * description box beside it to change or add things to that section — it's
 * more interactive."
 *
 * ⚠️ NOT a box per section. Seven textareas down one page is a form, and the
 * thing being built here is a conversation — so every section instead SEEDS
 * the one conversation at the bottom with what it is about. The person gets
 * "change this" exactly where the thought occurs, and the reply lands
 * somewhere they can follow it.
 */
function Section({ label, onSection }) {
  return (
    <h3 className="wayout__label wayout__sectionh">
      {label}
      {onSection && (
        <button type="button" className="wayout__change" onClick={() => onSection(label)}>
          change this
        </button>
      )}
    </h3>
  )
}

/**
 * 🔴🔴 REVERTED 29 Sep, AND THE REVERT IS THE DECISION — do not "improve" this
 * back into a single sequence without asking.
 *
 * I rebuilt this page as a numbered one-column walkthrough (an index at the top,
 * steps, only the first one loud, the long block collapsed) because Daniel asked
 * for something "less daunting, cleaner, more organised". Then, looking at it:
 * **"I'm not a big fan — I think I actually liked it before we changed it. I
 * like the yellow highlights, the whole feel before."**
 *
 * ⭐⭐ WHAT THE REBUILD GOT WRONG WAS NOT THE STRUCTURE, IT WAS THE CHARACTER.
 * Two columns, the warm highlighted card, the marked-up feel — that IS the
 * product's voice on this page, and a tidy numbered list is a manual. Being
 * easier to scan is not worth sounding like somebody else.
 *
 * ⚠️ The white space it was meant to fix is real and still open. The honest
 * shape of that fix is the one the plan hero and the board both needed: PAIR
 * INSIDE A SECTION, NEVER ACROSS A PAGE. Doing it here means keeping this
 * layout and pairing within each block — not replacing the page.
 *
 * ⚠️ AND ONE THING FROM THE REBUILD IS WORTH TAKING WHEN HE WANTS IT: "what
 * usually happens" is the longest block on the page and is only wanted once
 * something has gone wrong. Collapsing it removed about a fifth of the height
 * without touching the feel. Not applied — his call.
 */
export default function Playbook({ play, index = 1, children, onSection }) {
  if (!play) return null

  return (
    <WayoutShell title="This week" wide>
      {/* 🔴 THERE WAS NO WAY BACK FROM HERE EXCEPT THE BROWSER BUTTON. Daniel:
          "from this page and the previous one you should be able to go back to
          the main plan — we need either a back button or a home plan button or
          both." The only link to the plan sat at the very bottom of a page that
          is several screens long, which on the densest page in the product means
          it does not exist.
          ⚠️ At the TOP, where somebody decides to leave — not at the end, which
          is where somebody has already given up looking. */}
      <p className="wayout__crumb">
        <Link to={`${WAYOUT_BASE}/plan`}>← The whole plan</Link>
      </p>
      <p className="wayout__who">Move {index} · how to actually do it</p>
      {/* ⭐⭐ THE YELLOW STROKE BELONGS HERE TOO. Daniel, on getting the old
          design back: "no yellow highlight of the title back". He was right and
          it had never been here — measured on the rendered page, this was the
          one headline in the product with `marks: 0`, on the page a subscriber
          spends the most time on.
          ⚠️ `derive` because a move title carries no highlight field; the rule
          and its refusals are in lib/wayout/marked.jsx. */}
      <h2><Marked text={play.title} derive /></h2>

      {/* ⭐ Two columns on a desk, one on a phone. What to DO on the left —
          the action, the words, the money — and what to KNOW on the right.
          Running all of it down a 430px strip is why this read as a mobile
          page on a 1700px screen. */}
      <div className="wayout__spread">

      {play.thisWeek && (
        <div className="wayout__seen">
          <q>{play.thisWeek.when}</q>
          <b>{play.thisWeek.action}</b>
          {play.thisWeek.why_first && (
            <span className="wayout__gate" style={{ marginTop: 10 }}>{play.thisWeek.why_first}</span>
          )}
        </div>
      )}

      {/* ⭐ The words are usually the whole blocker. Somebody who knows exactly
          what to send sends it; somebody composing it from scratch on a Sunday
          night does not. Set as something you can copy, not as prose. */}
      {play.words?.script && (
        <div className="wayout__block">
          <Section label={play.words.context || 'What to say'} onSection={onSection} />
          <blockquote className="wayout__script">{play.words.script}</blockquote>
        </div>
      )}

      {play.money && (
        <div className="wayout__block">
          <Section label="The money" onSection={onSection} />
          <dl className="wayout__facts">
            {play.money.what_to_charge && (<><dt>What to charge</dt><dd>{play.money.what_to_charge}</dd></>)}
            {/* ⚠️ Where the figure came from is shown deliberately. The prompt
                forbids inventing a rate, so this line is how a reader can tell
                the difference between their own history and a guess. */}
            {play.money.how_you_know && (<><dt>How you know</dt><dd>{play.money.how_you_know}</dd></>)}
            {play.money.getting_paid && (<><dt>Getting paid</dt><dd>{play.money.getting_paid}</dd></>)}
          </dl>
        </div>
      )}

      {(play.need_first?.length > 0 || play.dont_need_yet?.length > 0) && (
        <div className="wayout__block wayout__twocol">
          {play.need_first?.length > 0 && (
            <div>
              <Section label="You need" onSection={onSection} />
              <ul className="wayout__list">{play.need_first.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {/* ⭐ As important as the other column. Most people do not fail from
              under-preparing — they spend three weeks and four hundred dollars
              on a logo, a name and a magnetic sign and never knock on a door. */}
          {play.dont_need_yet?.length > 0 && (
            <div>
              <Section label="Skip for now" onSection={onSection} />
              <ul className="wayout__list wayout__list--skip">
                {play.dont_need_yet.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {play.goes_wrong?.length > 0 && (
        <div className="wayout__block">
          <Section label="What usually happens" onSection={onSection} />
          <div className="wayout__cut">
            {play.goes_wrong.map((g, i) => (
              <div className="wayout__cutrow" key={i} style={{ cursor: 'default' }}>
                <s style={{ textDecoration: 'none' }}>{g.what}</s>
                <span className="wayout__cutwhy">{g.do}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Same rule as the advisor's domain boundaries: name the thing, name who
          actually knows, do not pretend to be them. */}
      {play.check_first?.length > 0 && (
        <div className="wayout__block">
          <Section label="Check before you start" onSection={onSection} />
          <div className="wayout__cut">
            {play.check_first.map((c, i) => (
              <div className="wayout__cutrow" key={i} style={{ cursor: 'default' }}>
                <s style={{ textDecoration: 'none' }}>{c.thing}</s>
                <span className="wayout__cutwhy">Ask: {c.who_knows}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* 🔴 "no mention of what is shown after step 3 is done." A walkthrough
          that stops at the last instruction leaves somebody holding a finished
          task with no idea whether anything moved. This says what being done
          OPENS — the gate cleared, or, on the last move, that the plan is
          finished and the next one starts from what actually happened.
          ⚠️ Conditional like everything else on this page: if the generator did
          not produce one, nothing renders. An empty section is information; a
          padded one is a lie with a heading on it. */}

      {/* ⚠️ THIS IS THE HALF THAT TELLS PEOPLE WHAT TO CHARGE AND WHAT TO SEND,
          so it is the half that most needs to say what it is not. The map has
          carried a disclaimer since it was built; the play-by-play had the
          field added to its contract and nothing rendered it, which is the
          same shape of gap as a rule living in one prompt and not another. */}

      {/* ⭐⭐ THE CLOSE RUNS FULL WIDTH, AND THAT IS A LAYOUT FIX AND A MEANING
          FIX AT ONCE. These two were the tail of the right-hand column, which
          made the page 916px of "what to know" against 632px of "what to do"
          and left a quarter-page of white under the left column — Daniel:
          "there is still a big blank space". PAIR INSIDE A SECTION, NEVER
          ACROSS A PAGE: the same rule the plan hero and the board both needed.

          ⚠️ And they were never "things to know" anyway. Everything in that
          column is context you read before you start; these two are what
          finishing MEANS and what it OPENS. A conclusion that sits in one
          column reads as a footnote to that column. */}
      {(play.done_when || play.opens) && (
        <div className="wayout__after">
          {play.done_when && (
            <p className="wayout__done"><b>Done when:</b> {play.done_when}</p>
          )}
          {play.opens && (
            <div className="wayout__opens">
              <b>And then</b>
              <p>{play.opens}</p>
            </div>
          )}
        </div>
      )}

      </div>

      <p className="wayout__disclaimer">{play.disclaimer}</p>
      {children}
    </WayoutShell>
  )
}
