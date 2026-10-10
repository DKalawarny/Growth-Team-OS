/**
 * ⭐⭐ THE PLAN, FILLING IN WHILE THEY ANSWER.
 *
 * Daniel: "what about one of the boxes being built as you go through the test
 * so they are enticed to see the outcome?" A friend had just told him the
 * questions felt like a long survey with nothing to show for it until the end.
 *
 * So the same sheet sits under every tap and every question. Each row is
 * something THEY said, in their own labels and their own words, and the three
 * moves stay empty until the plan is built. The empty slots are the point: they
 * are the only part of the sheet the questions cannot fill.
 *
 * 🔴 NOTHING HERE IS WRITTEN BY US ABOUT THEM. No verdict, no score, no guess at
 * a move. A row is either their answer or it is absent.
 *
 * ⚠️ A row with nothing in it is not rendered, so the sheet only ever grows.
 * The money row is passed in by the caller only once the money screen is behind
 * them (Daniel: "the money should populate after so people don't get turned
 * off"), and it shows what comes in and what goes out, never a judgement on it.
 */
const SLOTS = ['First move', 'Second move', 'Third move']

export default function PlanSoFar({ rows = [], empty = 'Your answers show here as you go.' }) {
  const filled = rows.filter(r => (r.text && r.text.trim()) || (r.items && r.items.length))
  return (
    <aside className="wayout__sheet" aria-label="Your plan so far">
      <div className="wayout__sheetrows">
        <p className="wayout__sheeth">Your plan so far</p>
        {filled.length === 0 && <p className="wayout__soempty">{empty}</p>}
        {filled.map(r => (
          <div className="wayout__sheetrow" key={r.label}>
            <em>{r.label}</em>
            {r.text
              ? <p className={r.hand ? 'is-hand' : undefined}>{r.text}</p>
              : (
                <span>
                  {r.items.map((t, i) => <span className="wayout__tok" key={`${t}-${i}`}>{t}</span>)}
                </span>
              )}
          </div>
        ))}
      </div>
      <div className="wayout__sheetmoves">
        <p className="wayout__sheeth">Your three moves</p>
        {SLOTS.map((s, i) => (
          <div className="wayout__sheetmove" key={s}>
            <b>{i + 1}</b>
            <span><s>{s}</s><i /></span>
          </div>
        ))}
        <p className="wayout__sheetfine">Built from your answers when you finish.</p>
      </div>
    </aside>
  )
}
