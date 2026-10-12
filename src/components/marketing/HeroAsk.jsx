import { useEffect, useRef, useState } from 'react'

/**
 * The moving part of the landing page: a question types itself into a Solomon
 * window and his answer writes out. A visitor can tap another question.
 *
 * ⚠️ 12 Oct 2026, Daniel: "can we make on the home page something interactive
 * so there is movement on the page." The page told people about Solomon in
 * words and never let them see him answer.
 *
 * Rules this holds to:
 *   - SCRIPTED, and labelled "Example". No AI call is made from the landing
 *     page, so it costs nothing and cannot say something we have not read.
 *   - The answers are Solomon's own, from live runs on 11 Oct, shortened. No
 *     figure appears that an owner did not give him, except in the "second
 *     crew lead" exchange, where the figures stand for his connected books.
 *   - The whole text is always in the page (the unrevealed part is only
 *     invisible), so the box never changes size as it types, search engines
 *     and screen readers get all of it, and the prerender is not caught
 *     half way through a sentence.
 *   - Movement is switched off for anyone who has asked their device to
 *     reduce motion: they see the finished exchange.
 */
const EXCHANGES = [
  // ⚠️ NOT demolition. The first version used Daniel's own demolition-to-
  // remediation idea and he asked for it out: "in case my old partner sees it."
  // Keep that example off every public page.
  {
    chip: 'Winter layoffs',
    q: 'Landscaping. Every winter I lay off half the crew and lose the good ones to other outfits by spring.',
    a: [
      'That cycle costs more than it shows: hiring, retraining, and the jobs that go sideways in April because the experienced hands are gone.',
      'Ask what would keep your best three on through winter. Snow is the obvious one: same crew, same trucks, often the same streets. Lighting installs and winter cleanups can carry two or three people more.',
      'And talk to them in September, not November. People leave because they do not know if you are coming back for them.',
    ],
  },
  // ⚠️ Moved here 12 Oct from the "Meet Solomon" section further down, which
  // had its own scripted chat until this panel made it redundant. Shortened
  // the same day so all four answers are about the same height (the panel is
  // as tall as the longest, and a long one left a hole under the others).
  // Every line left does a job, so do not cut one of these:
  //   - real figures from connected books
  //   - "are you expecting the work to hold the cost" (Daniel, 31 Aug): a
  //     cushion is one-time money and a wage is not. This is the line that
  //     stops a bad hire.
  //   - he remembers what the owner said in March, and the standard applied
  //     is the owner's own. Never put a value in his mouth the owner did not
  //     say first.
  //   - he names what he does NOT have (June payroll)
  //   - `doc`: he does not describe a forecast, he produces one.
  {
    chip: 'A second crew lead',
    q: 'Can I afford a second crew lead?',
    a: [
      'On the numbers, probably, though $47k is cushion, not work coming in. That carries a second lead about five months; are you expecting the work to hold the cost after that?',
      "You also told me in March you did not want to grow past the point where you still knew everyone's name. A second lead means a second crew.",
      'Over thirteen weeks, week nine is the tight one at $6,200. Your June payroll is not in yet, so that cushion is a May figure.',
    ],
    doc: 'Cash flow forecast \u00b7 saved to your Library',
  },
  {
    chip: 'A raise I cannot give',
    q: 'A good guy wants a raise. He has been here two months and I cannot go over the bracket for his position.',
    a: [
      'Hold the bracket. Move it for him at two months and you either move it for everyone or you have a secret.',
      'But no and not yet are different conversations. Give him a date, and tell him what you need to see by then.',
      'Then look at what you can give him now that is not the hourly rate. Benefits cost less than wages and often land better.',
    ],
  },
  {
    chip: 'Cutting a corner',
    q: 'A customer wants 15% off. I could hit it by quietly using cheaper material than I quoted.',
    a: [
      'Do not do it. Quoting one thing and delivering another without saying so is a lie with a price tag on it.',
      'You have two honest moves. Hold the price and explain what it buys. Or tell him you can hit his number, show him what changes, and let him choose.',
      'Either way you keep your word and your name.',
    ],
  },
]

const Q_MS = 22      // per character of the question
const A_MS = 45      // per word of the answer
const THINK_MS = 650
const NEXT_MS = 6500 // pause on a finished answer before moving on, until the visitor takes over

const wantsStill = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const wordCount = ex => ex.a.reduce((n, p) => n + p.split(' ').length, 0)

export default function HeroAsk() {
  const [idx, setIdx]       = useState(0)
  const [qShown, setQShown] = useState(0)      // characters of the question revealed
  const [aShown, setAShown] = useState(0)      // words of the answer revealed
  const [phase, setPhase]   = useState('idle') // idle | typing | thinking | answering | done
  const [touched, setTouched] = useState(false)
  const boxRef = useRef(null)

  const ex = EXCHANGES[idx]
  const total = wordCount(ex)

  // Start only once the panel is on screen. Reduced motion gets the finished exchange at once.
  useEffect(() => {
    if (wantsStill()) { setQShown(EXCHANGES[0].q.length); setAShown(wordCount(EXCHANGES[0])); setPhase('done'); return }
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setPhase('typing'); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setPhase(p => (p === 'idle' ? 'typing' : p)); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    let t
    if (phase === 'typing') {
      t = qShown < ex.q.length ? setTimeout(() => setQShown(n => n + 1), Q_MS) : setTimeout(() => setPhase('thinking'), 250)
    } else if (phase === 'thinking') {
      t = setTimeout(() => setPhase('answering'), THINK_MS)
    } else if (phase === 'answering') {
      t = aShown < total ? setTimeout(() => setAShown(n => n + 1), A_MS) : setTimeout(() => setPhase('done'), 0)
    } else if (phase === 'done' && !touched && !wantsStill()) {
      t = setTimeout(() => { setIdx(i => (i + 1) % EXCHANGES.length); setQShown(0); setAShown(0); setPhase('typing') }, NEXT_MS)
    }
    return () => clearTimeout(t)
  }, [phase, qShown, aShown, touched, ex.q.length, total])

  function pick(i) {
    setTouched(true)
    setIdx(i)
    if (wantsStill()) { setQShown(EXCHANGES[i].q.length); setAShown(wordCount(EXCHANGES[i])); setPhase('done') }
    else { setQShown(0); setAShown(0); setPhase('typing') }
  }

  return (
    <div ref={boxRef} className="max-w-2xl mx-auto text-left">
      <div className="rounded-2xl border border-white/12 bg-white/[0.04] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-brand-400" />
            <span className="text-sm font-semibold text-white">Solomon</span>
          </div>
          <span className="text-xs font-medium text-white/45">Example</span>
        </div>

        {/* Every exchange sits in the same grid cell and only the current one
            is visible, so the box is always as tall as the longest and the
            page never shifts when the question changes. */}
        <div className="grid">
          {EXCHANGES.map((item, n) => {
            const live = n === idx
            let seen = 0
            return (
              <div key={item.chip} aria-hidden={!live} className={`col-start-1 row-start-1 px-5 py-5 space-y-4 ${live ? '' : 'invisible'}`}>
                <div className="flex justify-end">
                  <p className="max-w-[88%] rounded-2xl rounded-br-md bg-brand-500 text-gray-950 text-[15px] leading-relaxed font-medium px-4 py-2.5">
                    <span>{item.q.slice(0, live ? qShown : 0)}</span>
                    <span aria-hidden className="opacity-0">{item.q.slice(live ? qShown : 0)}</span>
                  </p>
                </div>

                <div className="max-w-[94%] rounded-2xl rounded-bl-md bg-white/[0.07] border border-white/10 px-4 py-3.5 space-y-3 relative">
                  {live && phase === 'thinking' && (
                    <span aria-hidden className="absolute left-4 top-4 flex gap-1.5">
                      {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
                    </span>
                  )}
                  {item.a.map((para, pi) => (
                    <p key={pi} className="text-[15px] leading-relaxed text-white/90">
                      {para.split(' ').map((w, wi) => {
                        const on = live && seen++ < aShown
                        return <span key={wi} className={`transition-opacity duration-200 ${on ? 'opacity-100' : 'opacity-0'}`}>{w}{' '}</span>
                      })}
                    </p>
                  ))}
                  {/* The document the answer came with. Shows once the answer is written. */}
                  {item.doc && (
                    <div className={`inline-flex items-center gap-2 rounded-lg border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 transition-opacity duration-300 ${live && aShown >= total ? 'opacity-100' : 'opacity-0'}`}>
                      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="text-[13px] font-semibold text-brand-300">{item.doc}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-5 mb-3 text-sm text-white/60 text-center">Tap a question to ask him:</p>
      {/* Two by two on a phone, one row above that. Never three and an orphan. */}
      <div className="grid grid-cols-2 sm:flex sm:justify-center gap-2">
        {EXCHANGES.map((e, i) => (
          <button
            key={e.chip}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={i === idx}
            className={`text-sm font-semibold px-3 sm:px-4 py-2.5 rounded-full border transition-colors ${
              i === idx ? 'bg-white text-gray-950 border-white' : 'bg-white/5 text-white/80 border-white/15 hover:bg-white/10 hover:text-white'
            }`}
          >
            {e.chip}
          </button>
        ))}
      </div>
    </div>
  )
}
