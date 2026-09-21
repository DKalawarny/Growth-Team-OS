import WayoutShell from './WayoutShell'

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

export default function Playbook({ play, index = 1, children, onSection }) {
  if (!play) return null

  return (
    <WayoutShell title="This week" wide>
      <p className="wayout__who">Move {index} · how to actually do it</p>
      <h2>{play.title}</h2>

      {/* ⭐ Two columns on a desk, one on a phone. What to DO on the left —
          the action, the words, the money — and what to KNOW on the right.
          Running all of it down a 430px strip is why this read as a mobile
          page on a 1700px screen. */}
      <div className="wayout__spread">
      <div className="wayout__col">

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
        <>
          <Section label={play.words.context || 'What to say'} onSection={onSection} />
          <blockquote className="wayout__script">{play.words.script}</blockquote>
        </>
      )}

      {play.money && (
        <>
          <Section label="The money" onSection={onSection} />
          <dl className="wayout__facts">
            {play.money.what_to_charge && (<><dt>What to charge</dt><dd>{play.money.what_to_charge}</dd></>)}
            {/* ⚠️ Where the figure came from is shown deliberately. The prompt
                forbids inventing a rate, so this line is how a reader can tell
                the difference between their own history and a guess. */}
            {play.money.how_you_know && (<><dt>How you know</dt><dd>{play.money.how_you_know}</dd></>)}
            {play.money.getting_paid && (<><dt>Getting paid</dt><dd>{play.money.getting_paid}</dd></>)}
          </dl>
        </>
      )}

      </div>
      <div className="wayout__col">

      {(play.need_first?.length > 0 || play.dont_need_yet?.length > 0) && (
        <div className="wayout__twocol">
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
        <>
          <Section label="What usually happens" onSection={onSection} />
          <div className="wayout__cut">
            {play.goes_wrong.map((g, i) => (
              <div className="wayout__cutrow" key={i} style={{ cursor: 'default' }}>
                <s style={{ textDecoration: 'none' }}>{g.what}</s>
                <span className="wayout__cutwhy">{g.do}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Same rule as the advisor's domain boundaries: name the thing, name who
          actually knows, do not pretend to be them. */}
      {play.check_first?.length > 0 && (
        <>
          <Section label="Check before you start" onSection={onSection} />
          <div className="wayout__cut">
            {play.check_first.map((c, i) => (
              <div className="wayout__cutrow" key={i} style={{ cursor: 'default' }}>
                <s style={{ textDecoration: 'none' }}>{c.thing}</s>
                <span className="wayout__cutwhy">Ask: {c.who_knows}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {play.done_when && (
        <p className="wayout__done"><b>Done when:</b> {play.done_when}</p>
      )}

      {/* ⚠️ THIS IS THE HALF THAT TELLS PEOPLE WHAT TO CHARGE AND WHAT TO SEND,
          so it is the half that most needs to say what it is not. The map has
          carried a disclaimer since it was built; the play-by-play had the
          field added to its contract and nothing rendered it, which is the
          same shape of gap as a rule living in one prompt and not another. */}
      </div>
      </div>

      <p className="wayout__disclaimer">{play.disclaimer}</p>
      {children}
    </WayoutShell>
  )
}
