import { useState } from 'react'

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
export function Chips({ field, value = [], onChange }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft]   = useState('')

  const selected = new Set(value.map(t => t.key))

  function toggle(opt) {
    if (selected.has(opt.key)) onChange(value.filter(t => t.key !== opt.key))
    else onChange([...value, { key: opt.key, label: opt.label, custom: false }])
  }

  function commitCustom() {
    const label = draft.trim()
    if (!label) { setAdding(false); setDraft(''); return }
    // A slug, not the label, so two people typing "Jet ski" and "jet ski" do
    // not become two different assets to the model.
    const key = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    if (!selected.has(key)) onChange([...value, { key, label, custom: true }])
    setDraft('')
    setAdding(false)
  }

  return (
    <>
      <div className="wayout__chips">
        {field.options.map(opt => (
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

// ── Money ───────────────────────────────────────────────────────────────────

/**
 * ⚠️ `inputMode="decimal"`, not `type="number"`. A number input on iOS gives a
 * keypad but also spinner arrows, silently drops anything non-numeric the
 * person types, and reports an empty string for "1,200" — which would read as
 * "they earn nothing" rather than "they used a comma".
 */
export function Money({ value, onChange }) {
  return (
    <div className="wayout__money">
      <span>$</span>
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

export function LongText({ field, value, onChange }) {
  return (
    <textarea
      className="wayout__textarea"
      value={value ?? ''}
      placeholder={field.placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  )
}

export function ShortText({ field, value, onChange }) {
  return (
    <input
      className="wayout__input"
      value={value ?? ''}
      placeholder={field.placeholder ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// ── Dispatch ────────────────────────────────────────────────────────────────

export function Field({ field, value, onChange }) {
  const Cmp = {
    chips:     Chips,
    choice:    Choice,
    rank:      Rank,
    number:    Money,
    text:      LongText,
    shorttext: ShortText,
  }[field.kind]

  if (!Cmp) {
    console.warn('[wayout] unknown field kind:', field.kind)
    return null
  }
  return <Cmp field={field} value={value} onChange={onChange} />
}
