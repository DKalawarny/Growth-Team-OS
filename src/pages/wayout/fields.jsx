import { useState, useRef, useEffect } from 'react'

/**
 * The way out — one component per field kind, driven by src/content/wayoutIntake.js.
 *
 * Six near-identical screens written by hand is six places for validation, the
 * back button and the progress count to drift apart — and this is the part of
 * the product most likely to be reworded weekly.
 */

// ── Chips ───────────────────────────────────────────────────────────────────

/**
 * Multi-select chips with an optional "+ Add your own".
 *
 * ⭐ A CUSTOM CHIP IS A FIRST-CLASS ANSWER, not an "other" bucket. SPEC §9 makes
 * it an acceptance check: a custom asset ("jet ski") must produce a move as
 * well-formed as a built-in. It is stored in the same array, in the same shape,
 * with `custom: true` carried only so the model knows it was not on our list —
 * which is a reason to take it MORE seriously, not less. It renders identically.
 */
export function Chips({ field, value: raw = [], onChange }) {
  // ⚠️ Older drafts carried diagnostic goals as bare keys (["time"]). Read them
  // as the chips they are, so they show selected and are rewritten in shape the
  // first time anything changes — instead of a mixed array of both.
  const all = (field.groups ?? [{ options: field.options ?? [] }]).flatMap(g => g.options)
  const value = (Array.isArray(raw) ? raw : []).map(t => (typeof t === 'string'
    ? { key: t, label: all.find(o => o.key === t)?.label ?? t, custom: false }
    : t))
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState('')

  const selected = new Set(value.map(t => t.key))

  // ⭐ A field may declare `groups` instead of a flat `options`. The grouping is
  // not tidiness — on S3 it is the thing that stops the list reading as "tools
  // and trucks", by saying out loud that a skill, an evening and a person who
  // would sub you work are also things you already have.
  const groups = field.groups ?? [{ label: null, options: field.options ?? [] }]

  /**
   * ⚠️ An option may be `exclusive` — "Nothing, really" on S1, "None of this"
   * on S4. Picking it clears everything else, and picking anything else clears
   * it. Without that the form happily accepts "Nothing is holding me back" AND
   * "Shared custody", and the plan gets built from a contradiction.
   */
  const exclusiveKeys = new Set(
    groups.flatMap(g => g.options).filter(o => o.exclusive).map(o => o.key),
  )

  function toggle(opt) {
    if (selected.has(opt.key)) {
      onChange(value.filter(t => t.key !== opt.key))
      return
    }
    const chosen = { key: opt.key, label: opt.label, custom: false }
    if (opt.exclusive) { onChange([chosen]); return }
    onChange([...value.filter(t => !exclusiveKeys.has(t.key)), chosen])
  }

  function commitCustom() {
    const label = draft.trim()
    if (!label) { setAdding(false); setDraft(''); return }
    // A slug, not the label, so two people typing "Jet ski" and "jet ski" do
    // not become two different assets to the model.
    const key = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    if (!selected.has(key)) {
      onChange([...value.filter(t => !exclusiveKeys.has(t.key)), { key, label, custom: true }])
    }
    setDraft('')
    setAdding(false)
  }

  return (
    <>
      {groups.map((g, gi) => (
        <div key={g.label ?? gi}>
          {g.label && <p className="wayout__group">{g.label}</p>}
          <div className="wayout__chips">
            {g.options.map(opt => (
              <button
                type="button"
                key={opt.key}
                className={`wayout__chip${selected.has(opt.key) ? ' wayout__chip--on' : ''}`}
                aria-pressed={selected.has(opt.key)}
                onClick={() => toggle(opt)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="wayout__chips">
        {/* Custom entries the person added, rendered exactly like built-ins. */}
        {value.filter(t => t.custom).map(t => (
          <button
            type="button"
            key={t.key}
            className="wayout__chip wayout__chip--on"
            aria-pressed="true"
            onClick={() => onChange(value.filter(x => x.key !== t.key))}
          >
            {t.label}
          </button>
        ))}

        {field.allowCustom && !adding && (
          <button
            type="button"
            className="wayout__chip wayout__chip--add"
            onClick={() => setAdding(true)}
          >
            + Add your own
          </button>
        )}
      </div>

      {adding && (
        <input
          className="wayout__input"
          style={{ marginTop: 9 }}
          autoFocus
          value={draft}
          placeholder="What is it?"
          onChange={e => setDraft(e.target.value)}
          onBlur={commitCustom}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitCustom() }
            if (e.key === 'Escape') { setDraft(''); setAdding(false) }
          }}
        />
      )}
    </>
  )
}

// ── Single select ───────────────────────────────────────────────────────────

export function Choice({ field, value, onChange }) {
  return (
    <div className="wayout__chips">
      {field.options.map(opt => (
        <button
          type="button"
          key={opt.key}
          className={`wayout__chip${value === opt.key ? ' wayout__chip--on' : ''}`}
          aria-pressed={value === opt.key}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Rank ────────────────────────────────────────────────────────────────────

/**
 * ⚠️ BUTTONS, NOT DRAG. The spec says drag, and drag is the nicer interaction
 * on a desktop with a mouse. This is a phone product answered one-handed, and
 * HTML5 drag-and-drop does not fire on touch at all — a drag-only ranker is an
 * unanswerable required question on the device most people will use. Up/down
 * also works with a keyboard and a screen reader for free, which drag does not.
 */
export function Rank({ field, value, onChange }) {
  const order = value?.length ? value : field.options.map(o => o.key)
  const byKey = Object.fromEntries(field.options.map(o => [o.key, o.label]))

  function move(i, dir) {
    const next = [...order]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="wayout__rank">
      {order.map((key, i) => (
        <div className="wayout__rankrow" key={key}>
          <span>{i + 1}</span>
          {byKey[key] ?? key}
          <div className="wayout__rankbtns">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label={`Move ${byKey[key]} up`}
            >↑</button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              aria-label={`Move ${byKey[key]} down`}
            >↓</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Score ───────────────────────────────────────────────────────────────────

/**
 * Score each item 1–10.
 *
 * ⭐ Daniel: "make this a ranking system 1-10 by number, not arrows". Arrows on
 * nine items is nine rounds of nudging to express one opinion. Scoring is one
 * tap per row, allows ties, and says something an ordering cannot: that two of
 * these matter enormously and the rest barely register. An ordering forces a
 * lie — it makes you put something seventh that you actually do not care about
 * at all.
 *
 * ⚠️ Buttons rather than a slider or a number box: a slider on a phone is a
 * fight, and a number field opens a keypad for a single digit.
 */
export function Score({ field, value, onChange }) {
  const scores = value ?? {}
  return (
    <div className="wayout__scores">
      {field.options.map(opt => (
        <div className="wayout__scorerow" key={opt.key}>
          <span className="wayout__scorelabel">{opt.label}</span>
          <div className="wayout__scale" role="group" aria-label={opt.label}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button
                type="button"
                key={n}
                className={`wayout__scorebtn${scores[opt.key] === n ? ' wayout__scorebtn--on' : ''}`}
                aria-pressed={scores[opt.key] === n}
                onClick={() => onChange({ ...scores, [opt.key]: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Money ───────────────────────────────────────────────────────────────────

/**
 * ⚠️ `inputMode="decimal"`, not `type="number"`. A number input on iOS gives a
 * keypad but also spinner arrows, silently drops anything non-numeric the
 * person types, and reports an empty string for "1,200" — which would read as
 * "they earn nothing" rather than "they used a comma".
 */
export function Money({ value, onChange, currency = '$' }) {
  return (
    <div className="wayout__money">
      <span>{currency}</span>
      <input
        className="wayout__input"
        inputMode="decimal"
        value={value ?? ''}
        placeholder="0"
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '')
          onChange(cleaned === '' ? '' : cleaned)
        }}
      />
    </div>
  )
}

// ── Text ────────────────────────────────────────────────────────────────────


/**
 * ⭐⭐ TALK INSTEAD OF TYPE. Daniel: "can we add a talk to text on the written
 * question parts, i think people would like that."
 *
 * ⚠️ AND IT MATTERS MORE HERE THAN ON AN ORDINARY FORM. The three questions this
 * product now REQUIRES in writing are what everything downstream is built from —
 * what they have already tried, what they will not do, and whatever the chips
 * missed. Typing is a tax on exactly the people with the least slack: somebody on
 * a phone, at eleven at night, after a shift. The ones most likely to give a
 * three-word answer are the ones whose plan most depends on a longer one.
 *
 * ⚠️ BROWSER RECOGNITION, NOT A VENDOR. It is free, it needs no key, and it adds
 * no billing relationship — the same call made for dictation on the other
 * product. The cost is that support is uneven, so this renders NOTHING at all
 * where it does not exist rather than a button that does nothing.
 *
 * 🔴 THE TRANSCRIPT IS APPENDED, NEVER SUBSTITUTED. Recognition drops words and
 * mishears names; replacing a box somebody has already typed into would lose
 * their words to fix our feature. It adds to the end, and they can edit.
 */
const Recognition = typeof window !== 'undefined'
  && (window.SpeechRecognition || window.webkitSpeechRecognition)

export function Dictate({ value, onChange, label }) {
  const [on, setOn] = useState(false)
  const ref = useRef(null)

  // ⚠️ Stop the microphone if the field unmounts mid-sentence. Without this,
  // navigating on while it is listening leaves the browser recording with no
  // visible indication anywhere in the product that it is.
  useEffect(() => () => { try { ref.current?.stop() } catch { /* already stopped */ } }, [])

  if (!Recognition) return null

  function toggle() {
    if (on) { try { ref.current?.stop() } catch { /* already stopped */ } ; return }
    const r = new Recognition()
    ref.current = r
    r.continuous = true
    r.interimResults = false
    r.lang = navigator.language || 'en-CA'
    r.onresult = e => {
      let said = ''
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) said += e.results[i][0].transcript
      }
      if (!said.trim()) return
      const base = (value ?? '').trim()
      onChange(base ? `${base} ${said.trim()}` : said.trim())
    }
    r.onend = () => setOn(false)
    // ⚠️ A denied microphone must not leave the button stuck mid-listen.
    r.onerror = () => setOn(false)
    try { r.start(); setOn(true) } catch { setOn(false) }
  }

  return (
    <button
      type="button"
      className={`wayout__mic${on ? ' is-on' : ''}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? `Stop dictating ${label ?? 'this answer'}` : `Dictate ${label ?? 'this answer'}`}
      title={on ? 'Stop' : 'Say it instead'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
      <span>{on ? 'Listening…' : 'Say it'}</span>
    </button>
  )
}

export function LongText({ field, value, onChange }) {
  return (
    <div className="wayout__withmic">
      <textarea
        className="wayout__textarea"
        value={value ?? ''}
        placeholder={field.placeholder ?? ''}
        onChange={e => onChange(e.target.value)}
      />
      <Dictate value={value} onChange={onChange} label={field.label} />
    </div>
  )
}

export function ShortText({ field, value, onChange }) {
  /**
   * ⚠️ OPT-IN, NOT BLANKET. Daniel asked for talk-to-text on "the written question
   * parts" and this kind covers both — "Where are you based, and where does the
   * work happen?" is a written answer somebody might rather say out loud, and
   * "How old are you?" is two keystrokes. A microphone beside a number field is
   * noise, and noise beside every field is how a good affordance stops being
   * noticed at the one place it matters.
   */
  const inner = (
    <input
      className="wayout__input"
      value={value ?? ''}
      placeholder={field.placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  )
  if (!field.dictate) return inner
  return (
    <div className="wayout__withmic">
      {inner}
      <Dictate value={value} onChange={onChange} label={field.label} />
    </div>
  )
}

// ── Dispatch ────────────────────────────────────────────────────────────────

export function Field({ field, value, onChange, currency = '$' }) {
  const Cmp = {
    chips:     Chips,
    choice:    Choice,
    rank:      Rank,
    score:     Score,
    number:    Money,
    text:      LongText,
    shorttext: ShortText,
  }[field.kind]

  if (!Cmp) {
    console.warn('[wayout] unknown field kind:', field.kind)
    return null
  }
  return <Cmp field={field} value={value} onChange={onChange} currency={currency} />
}
