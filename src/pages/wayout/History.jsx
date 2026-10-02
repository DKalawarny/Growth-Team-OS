import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { loadOrCreateSession, chapterChain } from '../../lib/wayout/session'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { tidyQuote, firstSentences } from '../../lib/wayout/tidyQuote'
import { distance, doneMoves } from '../../lib/wayout/distance'
import { humanError } from '../../lib/wayout/humanError'

/**
 * The way out — the whole way here.
 *
 * ⭐⭐ Daniel: "there is a whole history of where the person started and what
 * their original vision was."
 *
 * 🔴 THE CHAIN HAS EXISTED SINCE MIGRATION 066 AND NOTHING EVER SHOWED IT. Every
 * chapter knows its parent; `historyFor` walks one hop back purely to feed the
 * next prompt. So the product has always been able to tell somebody how far they
 * have come and has never once done it.
 *
 * ⭐⭐ IT IS THE COMMERCIAL SPINE. This product finishes — three moves, two
 * gates, out — so a second plan on its own reads as starting over, and nobody
 * pays to start over. The record of where they began is what turns a repeat into
 * a continuation.
 *
 * ⭐⭐ AND IT IS THE ONLY HONEST FORM OF CREDIT. The voice rules ban
 * encouragement outright — "you've come so far" carries no information and could
 * be written without reading a word they typed. Their own first sentence, beside
 * where they are now, is an observation they cannot argue with. It needs no
 * adjectives, and that is precisely why it works.
 *
 * ⚠️ THEIR ANSWERS, AND THE HEADLINES OF WHAT THEY DID. Never an old map's
 * figures — those are ours, and presenting one back as settled fact is the
 * laundering path this product has guarded against since 16 Sep.
 */
const OUTCOME_LABEL = {
  landed:  'You got there',
  partly:  'Closer, not there',
  no:      'Did the work, it did not land',
  changed: 'You wanted something else',
}

export default function History() {
  const [chain, setChain] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadOrCreateSession()
      .then(s => chapterChain(s))
      .then(c => { if (!cancelled) { setChain(c); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  if (loading) return <WayoutShell><p className="wayout__lead">One moment.</p></WayoutShell>
  if (error)   return <WayoutShell><p className="wayout__lead">{humanError(error)}</p></WayoutShell>

  const first = chain[0]
  const latest = chain[chain.length - 1]
  const sameWant = (a, b) => String(a ?? '').trim() === String(b ?? '').trim()
  const latestWant = chain.length > 1 && latest?.answers?.out
    && !sameWant(latest.answers.out, first?.answers?.out)
    ? latest.answers.out
    : null

  /**
   * ⭐⭐ THE ROAD NOT TAKEN, GATHERED ACROSS EVERY CHAPTER. Deduplicated on the
   * label because a thing ruled out in chapter one is usually ruled out again
   * in chapter two, and the same line twice reads as a bug rather than as
   * consistency.
   * ⚠️ Newest wins on a repeat: the reason a thing is still crossed off may
   * have changed even when the thing has not.
   */
  const cuts = [...new Map(
    chain.flatMap(c => (c.cut ?? []).filter(x => x?.label).map(x => [x.label, x])),
  ).values()]
  const moved = distance(chain)
  const did = doneMoves(chain)
  const money = n => `$${Math.abs(n).toLocaleString()}`
  const when = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <WayoutShell title="The whole way here" wide>
      <p className="wayout__crumb"><Link to={`${WAYOUT_BASE}/plan`}>← The plan you are on</Link></p>
      <h1 className="wayout__bigq">The whole way here.</h1>

      {/* ⭐⭐ THE DISTANCE, IN THEIR OWN FIGURES — and it is the strongest thing
          this page can say precisely because it says nothing.
          `takeHome` and `mustPay` are asked at the intake and re-asked at every
          chapter, so the product has always held their margin at March and their
          margin at September and has never once put the two side by side.
          ⚠️ No adjective, no verdict, no "well done". The voice rules ban
          encouragement because a sentence that could be pasted into a stranger's
          plan proves nobody read theirs. Two numbers they typed themselves is
          the one form of credit they cannot argue with.
          ⚠️ And it renders a FALL exactly as plainly as a rise. A product that
          only shows the distance when the distance flatters is not keeping a
          record, it is running a campaign. */}
      {moved && (
        <div className="wayout__moved">
          <span className="wayout__label">Left at the end of the month, in your own numbers</span>
          <div className="wayout__movedrow">
            <div>
              <b>{money(moved.then)}</b>
              <em>{moved.fromDate ? when(moved.fromDate) : 'when you started'}</em>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <b>{money(moved.now)}</b>
              <em>now</em>
            </div>
          </div>
          {moved.direction !== 'flat' && (
            <p className="wayout__movedsum">
              {moved.direction === 'up' ? 'Up' : 'Down'} {money(moved.change)} a month
              since your first plan.
            </p>
          )}
        </div>
      )}

      {/* ⭐⭐ THEIR FIRST SENTENCE BESIDE THEIR LATEST, and it sits directly under
          the figures because these two are the same statement told twice — once
          in money and once in their own words. Below the lists it read as an
          afterthought to a receipt.
          ⚠️ ONLY WHERE THEY ACTUALLY DIFFER. The destination carries over
          untouched on a "partly" or a "no" — they have not arrived, so it is
          not re-asked — and printing the identical paragraph twice under a
          heading about how far they have come would be the product inventing a
          change they did not make.
          ⭐ The origin quote shows from the FIRST chapter, not the second. Their
          own opening sentence is worth meeting again whether or not there is
          anything behind it yet. */}
      {first?.answers?.out && (
        <div className="wayout__origin wayout__origin--light">
          <span>What you said you wanted, at the very beginning</span>
          <q>{firstSentences(tidyQuote(first.answers.out), 260)}</q>
        </div>
      )}

      {latestWant && (
        <div className="wayout__origin wayout__origin--light wayout__origin--now">
          <span>What you are aiming at now</span>
          <q>{firstSentences(tidyQuote(latestWant), 260)}</q>
        </div>
      )}

      {/* ⭐⭐ WHAT THEY ACTUALLY DID, WITH THE DATE. `done_at` has been written on
          every tick since the gates were built and only the gate has ever read
          it — so the product has always known the day somebody had the
          conversation they had been dreading for a year, and never told them.
          ⭐ The date is what turns a checkbox into an achievement: it says a
          particular morning in March was the morning they did it.
          ⚠️ This shows on a FIRST plan too, which the page previously could not
          do — it opened with "there is nothing behind it yet" even for somebody
          who had already done two of their three moves. Their history does not
          begin at chapter two. */}
      {did.length > 0 && (
        <div className="wayout__didlist">
          <h2 className="wayout__sectionh">What you have done so far</h2>
          <ol>
            {did.map((m, i) => (
              <li key={`${m.chapter}-${i}`}>
                <b>{m.title}</b>
                <em>{when(m.doneAt)}</em>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ⭐⭐ WHAT THEY LEFT ALONE, AND WHY — and nothing else in this category
          keeps this record. Everything else a person reads adds to the list;
          this is the only page that tells them what they were right to ignore,
          months later, in the plan's own words.
          🔴 IT IS A RECORD, NOT A VERDICT. "You were right not to" is a
          judgement this product cannot make — it does not know what would have
          happened. So the heading states what they did and the reason is the
          one the plan gave at the time. The reassurance is in the fact, not in
          an adjective laid on top of it. */}
      {cuts.length > 0 && (
        <div className="wayout__leftalone">
          <h2 className="wayout__sectionh">What you decided to leave alone</h2>
          <div className="wayout__cut">
            {cuts.map((c, i) => (
              <div className="wayout__cutrow" key={i} style={{ cursor: 'default' }}>
                <s style={{ textDecoration: 'none' }}>{c.label}</s>
                {c.why && <span className="wayout__cutwhy">{c.why}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ ONE CHAPTER IS NOT A HISTORY. Showing a single card under a heading
          about how far somebody has come would be the product congratulating
          them for arriving at the start line.
          ⚠️ AND THE EMPTY STATE MUST NOT READ AS AN ACCUSATION. A record of what
          you achieved is a record of what you did not, for anybody who stalled —
          so where nothing is ticked this says what is true (the plan is the
          newest thing here) and never counts what is missing. */}
      {chain.length < 2 ? (
        did.length === 0 && (
          <p className="wayout__lead">
            This is your first plan, so there is nothing behind it yet. As you
            tick moves off they show up here with the date, and when you start
            your next plan what you wrote today sits at the top of it.
          </p>
        )
      ) : (
        <>

          <ol className="wayout__arc">
            {chain.map((c, i) => (
              <li key={c.id} className={c.outcome ? `is-${c.outcome}` : 'is-open'}>
                <div className="wayout__arcmark" aria-hidden="true" />
                <div className="wayout__arcbody">
                  <p className="wayout__arckick">
                    Chapter {c.chapter}
                    {c.createdAt && <em> · {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</em>}
                  </p>

                  {/* 🔴 "doubled up." The origin block above IS chapter one's
                      answer, and this printed the identical 905 characters again
                      directly beneath it. ⭐ The first chapter's destination is
                      already quoted at the top of the page, so here it is only
                      shown from chapter two on — and trimmed, because a heading
                      is a heading. */}
                  {c.answers?.out && !(i === 0 && first?.answers?.out) && (
                    <h3>{firstSentences(tidyQuote(c.answers.out), 120)}</h3>
                  )}

                  {c.moves.length > 0 && (
                    <ul className="wayout__arcmoves">
                      {c.moves.map((m, i) => <li key={i}>{m.title}</li>)}
                    </ul>
                  )}

                  {/* ⭐⭐ THE WAY BACK INTO A FINISHED PLAN. Daniel: "how do I get
                      back to my first plan from the second?" — and until now the
                      answer was that you could not. This page showed the shape of
                      each chapter; the board itself was unreachable.
                      ⚠️ Only where a plan was actually written. A chapter that
                      never got one would open on an error. */}
                  {c.destination !== undefined && c.moves.length > 0 && c.id !== chain[chain.length - 1].id && (
                    <p className="wayout__arcopen">
                      <Link to={`${WAYOUT_BASE}/plan?was=${c.id}`}>Open this plan →</Link>
                    </p>
                  )}

                  {c.outcome ? (
                    <p className="wayout__arcout">
                      <b>{OUTCOME_LABEL[c.outcome] ?? c.outcome}</b>
                      {c.outcomeNote && <span>{tidyQuote(c.outcomeNote)}</span>}
                    </p>
                  ) : (
                    <p className="wayout__arcout"><b>Where you are now</b></p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </WayoutShell>
  )
}
