import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { WAYOUT_BASE } from '../../lib/wayout/brand'

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
 * ⭐⭐ ONE STEP OF THE WALKTHROUGH. Heading, an optional "change this", and the
 * content — with a quiet numeral on the spine so the sequence is visible without
 * being counted out loud.
 *
 * ⚠️ THE NUMERALS ARE SET SMALL AND LOWERCASE-QUIET ON PURPOSE. The plan board
 * already numbers things — MOVE 1, MOVE 2, MOVE 3 — and two numbering systems on
 * one product is the "two different threes" mistake. These are visually
 * subordinate: a spine, not a rank.
 */
function Step({ n, label, onSection, loud = false, children }) {
  return (
    <section className={`wayout__step${loud ? ' is-loud' : ''}`}>
      <div className="wayout__stepbar">
        <i className="wayout__stepn">{String(n).padStart(2, '0')}</i>
        <h3 className="wayout__steph">{label}</h3>
        {onSection && (
          <button type="button" className="wayout__change" onClick={() => onSection(label)}>
            change this
          </button>
        )}
      </div>
      <div className="wayout__stepbody">{children}</div>
    </section>
  )
}

/**
 * The way out — how to actually do the move you are on.
 *
 * 🔴🔴 REBUILT 29 Sep. Daniel: "there is a lot of white space on all of these,
 * and I think they could be less daunting — cleaner, more organised, with steps
 * or headings."
 *
 * ⭐⭐ THE WHITE SPACE WAS A SYMPTOM AND THE CAUSE WAS THE FILING. This page had
 * two columns — "what to DO" on the left, "what to KNOW" on the right — and the
 * reference material is roughly twice the height of the instructions. So the
 * left column ran out while the right kept going, every single time, for any
 * content. Balancing it would have been treating the stain.
 *
 * ⭐⭐ A WALKTHROUGH IS A SEQUENCE, AND IT WAS LAID OUT AS TWO TOPICS. That is
 * also why it read as daunting: with action and reference given equal weight and
 * no order between them, a reader cannot tell how much of the page is a thing to
 * do tonight and how much is a list to consult if something goes wrong. It all
 * looks like homework.
 *
 * Three things do the work now:
 *   · ONE COLUMN. A single measure cannot run out beside anything, so the white
 *     space is gone structurally rather than by balancing two heights.
 *   · AN INDEX AT THE TOP, so the first thing somebody sees is how few steps
 *     there are. That is most of "less daunting" on its own.
 *   · ONLY THE FIRST STEP IS LOUD. "You need" used to shout as loudly as the
 *     thing to do tonight.
 *
 * ⚠️ AND "WHAT USUALLY HAPPENS" IS COLLAPSED. It is the longest block on the
 * page and it is only wanted when something has actually gone wrong — native
 * <details>, so it costs no JavaScript and keeps its keyboard behaviour.
 *
 * ⚠️ Presentation only, unchanged: every block is conditional, because a
 * play-by-play that invents a licensing requirement or a going rate to fill a
 * section is the exact failure the prompt spends most of its length preventing.
 * An empty section is information; a padded one is a lie with a heading on it.
 */
export default function Playbook({ play, index = 1, children, onSection }) {
  if (!play) return null

  const hasBefore = play.need_first?.length > 0
    || play.dont_need_yet?.length > 0
    || play.check_first?.length > 0

  // ⚠️ Built from what actually exists, so the index can never advertise a step
  // the page does not have.
  const steps = [
    play.thisWeek && 'Do this first',
    play.words?.script && (play.words.context || 'Say this'),
    hasBefore && 'Before you start',
    play.money && 'The money',
    play.goes_wrong?.length > 0 && 'If it goes wrong',
    (play.done_when || play.opens) && 'You are done when',
  ].filter(Boolean)

  let n = 0
  const next = () => (n += 1)

  return (
    <WayoutShell title="This week" wide>
      {/* 🔴 THERE WAS NO WAY BACK FROM HERE EXCEPT THE BROWSER BUTTON. The only
          link to the plan sat at the foot of a page several screens long, which
          on the densest page in the product is the same as no link.
          ⚠️ At the TOP, where somebody decides to leave — not at the end, which
          is where somebody has already given up looking. */}
      {/* ⭐⭐ HYBRID, 29 Sep. Daniel: "I think I liked the design better before —
          can we do a bit of a hybrid between the two."
          
          He is right that the narrow centred column threw away what the old
          two-column page had: it used the width, and it read as a substantial
          document rather than a thin strip in a big sheet.
          
          ⭐⭐ THE FIX IS WHERE THE PAIRING HAPPENS, NOT WHETHER IT DOES. The old
          page paired at the PAGE level — all the doing on the left, all the
          knowing on the right — and those two piles are never the same height,
          so one always ran out. This pairs INSIDE a step, where the two halves
          are about one thing and therefore about one size. The width comes back
          and the dangling white does not. */}
      <div className="wayout__playwrap">
      <p className="wayout__crumb">
        <Link to={`${WAYOUT_BASE}/plan`}>← The whole plan</Link>
      </p>
      <p className="wayout__who">Move {index} · how to actually do it</p>
      <h2 className="wayout__playh">{play.title}</h2>

      {/* ⭐⭐ THE SHAPE OF THE PAGE, BEFORE ANY OF IT. Six short words tell
          somebody this is finite — which is the difference between a walkthrough
          and homework. */}
      <ol className="wayout__steps">
        {steps.map((label, i) => (
          <li key={label}><i>{String(i + 1).padStart(2, '0')}</i>{label}</li>
        ))}
      </ol>

      <div className="wayout__play">

        {play.thisWeek && (
          <Step n={next()} label="Do this first" loud>
            {play.thisWeek.when && <p className="wayout__when">{play.thisWeek.when}</p>}
            {/* ⚠️ The reason sits BESIDE the action rather than under it — same
                subject, so the two halves are about the same height and the card
                fills instead of trailing off. */}
            <div className="wayout__doing">
              <p className="wayout__action">{play.thisWeek.action}</p>
              {play.thisWeek.why_first && (
                <p className="wayout__why">{play.thisWeek.why_first}</p>
              )}
            </div>
          </Step>
        )}

        {/* ⭐ The words are usually the whole blocker. Somebody who knows exactly
            what to send sends it; somebody composing it from scratch on a Sunday
            night does not. Set as something to copy, not as prose. */}
        {play.words?.script && (
          <Step n={next()} label={play.words.context || 'Say this'} onSection={onSection}>
            <blockquote className="wayout__script">{play.words.script}</blockquote>
          </Step>
        )}

        {hasBefore && (
          <Step n={next()} label="Before you start" onSection={onSection}>
            {/* ⚠️ Three-up across the width — what to bring, what to leave, what
                to ask. They are the same KIND of list, so they belong on one
                row; it was the old page's best idea and it is kept. */}
            <div className="wayout__before">
              {play.need_first?.length > 0 && (
                <div>
                  <h4>What you need</h4>
                  <ul className="wayout__list">{play.need_first.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              )}
              {/* ⭐ As important as the other list. Most people do not fail from
                  under-preparing — they spend three weeks and four hundred
                  dollars on a logo, a name and a magnetic sign and never knock
                  on a door. */}
              {play.dont_need_yet?.length > 0 && (
                <div>
                  <h4>What to skip for now</h4>
                  <ul className="wayout__list wayout__list--skip">
                    {play.dont_need_yet.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            {/* Same rule as the advisor's domain boundaries: name the thing, name
                who actually knows, do not pretend to be them. */}
              {play.check_first?.length > 0 && (
                <div className="wayout__checks">
                  <h4>Check first</h4>
                  {play.check_first.map((c, i) => (
                    <p key={i}><b>{c.thing}</b><span>Ask: {c.who_knows}</span></p>
                  ))}
                </div>
              )}
            </div>
          </Step>
        )}

        {play.money && (
          <Step n={next()} label="The money" onSection={onSection}>
            <dl className="wayout__facts">
              {play.money.what_to_charge && (<><dt>What to charge</dt><dd>{play.money.what_to_charge}</dd></>)}
              {/* ⚠️ Where the figure came from is shown deliberately. The prompt
                  forbids inventing a rate, so this line is how a reader tells
                  their own history from a guess. */}
              {play.money.how_you_know && (<><dt>How you know</dt><dd>{play.money.how_you_know}</dd></>)}
              {play.money.getting_paid && (<><dt>Getting paid</dt><dd>{play.money.getting_paid}</dd></>)}
            </dl>
          </Step>
        )}

        {play.goes_wrong?.length > 0 && (
          <Step n={next()} label="If it goes wrong" onSection={onSection}>
            {/* ⚠️ CLOSED BY DEFAULT. This is the longest block on the page and it
                is only wanted once something has actually gone wrong — open, it
                was most of what made the page look like homework.
                ⭐ Native <details>: no JavaScript, and it keeps its keyboard and
                find-in-page behaviour, which a hand-rolled toggle loses. */}
            {play.goes_wrong.map((g, i) => (
              <details className="wayout__wrong" key={i}>
                <summary>{g.what}</summary>
                <p>{g.do}</p>
              </details>
            ))}
          </Step>
        )}

        {(play.done_when || play.opens) && (
          <Step n={next()} label="You are done when">
            {play.done_when && <p className="wayout__donewhen">{play.done_when}</p>}
            {/* 🔴 "no mention of what is shown after step 3 is done." A
                walkthrough that stops at its last instruction leaves somebody
                holding a finished task with no idea whether anything moved. */}
            {play.opens && (
              <div className="wayout__opens">
                <b>And then</b>
                <p>{play.opens}</p>
              </div>
            )}
          </Step>
        )}
      </div>

      {/* ⚠️ THIS IS THE HALF THAT TELLS PEOPLE WHAT TO CHARGE AND WHAT TO SEND,
          so it is the half that most needs to say what it is not. */}
      <p className="wayout__disclaimer">{play.disclaimer}</p>
      {children}
      </div>
    </WayoutShell>
  )
}
