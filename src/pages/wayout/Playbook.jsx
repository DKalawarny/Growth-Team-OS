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
export default function Playbook({ play, index = 1 }) {
  if (!play) return null

  return (
    <WayoutShell title="This week">
      <p className="wayout__who">Move {index} · how to actually do it</p>
      <h2>{play.title}</h2>

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
          <h3 className="wayout__label">{play.words.context || 'What to say'}</h3>
          <blockquote className="wayout__script">{play.words.script}</blockquote>
        </>
      )}

      {play.money && (
        <>
          <h3 className="wayout__label">The money</h3>
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

      {(play.need_first?.length > 0 || play.dont_need_yet?.length > 0) && (
        <div className="wayout__twocol">
          {play.need_first?.length > 0 && (
            <div>
              <h3 className="wayout__label">You need</h3>
              <ul className="wayout__list">{play.need_first.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}
          {/* ⭐ As important as the other column. Most people do not fail from
              under-preparing — they spend three weeks and four hundred dollars
              on a logo, a name and a magnetic sign and never knock on a door. */}
          {play.dont_need_yet?.length > 0 && (
            <div>
              <h3 className="wayout__label">Skip for now</h3>
              <ul className="wayout__list wayout__list--skip">
                {play.dont_need_yet.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {play.goes_wrong?.length > 0 && (
        <>
          <h3 className="wayout__label">What usually happens</h3>
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
          <h3 className="wayout__label">Check before you start</h3>
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
      <p className="wayout__disclaimer">{play.disclaimer}</p>
    </WayoutShell>
  )
}
