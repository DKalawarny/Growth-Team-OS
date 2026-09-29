import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { loadOrCreateSession, chapterChain } from '../../lib/wayout/session'
import { WAYOUT_BASE } from '../../lib/wayout/brand'
import { tidyQuote, firstSentences } from '../../lib/wayout/tidyQuote'

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
  if (error)   return <WayoutShell><p className="wayout__lead">{error}</p></WayoutShell>

  const first = chain[0]

  return (
    <WayoutShell title="The whole way here" wide>
      <p className="wayout__crumb"><Link to={`${WAYOUT_BASE}/plan`}>← The plan you are on</Link></p>
      <h1 className="wayout__bigq">The whole way here.</h1>

      {/* ⚠️ ONE CHAPTER IS NOT A HISTORY. Showing a single card under a heading
          about how far somebody has come would be the product congratulating
          them for arriving at the start line. */}
      {chain.length < 2 ? (
        <p className="wayout__lead">
          This is your first plan, so there is nothing behind it yet. When you
          finish it and start the next one, what you wrote today is what shows up
          here.
        </p>
      ) : (
        <>
          {first?.answers?.out && (
            <div className="wayout__origin wayout__origin--light">
              <span>What you said you wanted, at the very beginning</span>
              <q>{firstSentences(tidyQuote(first.answers.out), 260)}</q>
            </div>
          )}

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
