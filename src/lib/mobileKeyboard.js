// The on-screen keyboard, made to behave like it does in any messaging app.
// Daniel, 19 Oct, typing to Solomon on an iPhone: "it should work like any
// other text type device".
//
// Two things, both written onto <html> so CSS can do the rest:
//
//   --app-h      the height actually visible right now. iOS Safari does not
//                shrink the page for the keyboard; it slides the keyboard over
//                it and scrolls the page to keep the field in view. 100vh (and
//                even 100dvh) stays the full screen, so a full-height app shell
//                ends up partly under the keyboard and shifting as you type.
//                visualViewport.height is the part you can see.
//   .kb-open     a text field has focus on a touch screen, i.e. the keyboard
//                is up. The bottom tab bar hides, the way messaging apps hide
//                theirs, so the keyboard sits right under what you are typing.
//
// ⚠️ Touch only. A laptop with a focused field has no keyboard covering
// anything, and hiding its nav on focus would be a bug of its own.

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''])

function isTextEntry(el) {
  if (!el) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') return TEXT_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase())
  return false
}

export function isTouchScreen() {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
}

let installed = false

export function installMobileKeyboard() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const root = document.documentElement
  const vv = window.visualViewport

  // ⚠️ Only while the keyboard is up. visualViewport also shrinks when you
  // pinch to zoom, and a shell that shrank with every pinch would be worse
  // than the bug this fixes. Otherwise the CSS falls back to 100dvh.
  const sync = () => {
    if (!vv) return
    if (!root.classList.contains('kb-open')) { root.style.removeProperty('--app-h'); return }
    root.style.setProperty('--app-h', `${Math.round(vv.height)}px`)
    // iOS scrolls the whole page up to reveal the field; the shell is already
    // sized to what is visible, so pin it back to the top or it sits shifted
    // with a gap under it.
    if (root.classList.contains('kb-open') && window.scrollY !== 0) window.scrollTo(0, 0)
  }

  document.addEventListener('focusin', e => {
    if (isTouchScreen() && isTextEntry(e.target)) { root.classList.add('kb-open'); sync() }
  })
  document.addEventListener('focusout', () => {
    // Moving from one field to the next fires focusout then focusin; wait a
    // tick so the tab bar does not flash in between.
    setTimeout(() => {
      if (!isTextEntry(document.activeElement)) { root.classList.remove('kb-open'); sync() }
    }, 50)
  })

  if (vv) {
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    sync()
  }
}
