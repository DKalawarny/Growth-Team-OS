/**
 * Tooltip — instant-hover popover, pure CSS, no library.
 *
 * Why we built our own:
 *   - Browser-native `title=` attributes have a ~500ms delay that feels
 *     sluggish, and they look like OS chrome, not our app.
 *   - We don't need positioning intelligence (floating-ui, popper, etc.)
 *     because every place we use this, the parent is laid out so a
 *     fixed-direction tooltip works.
 *   - Pure Tailwind `group-hover` means no React state, no useEffect, no
 *     re-renders on hover. It's literally a CSS opacity transition.
 *
 * Usage:
 *   <Tooltip label="Revenue" sublabel="sales, marketing, growth">
 *     <span className="w-2 h-2 rounded-full bg-green-500" />
 *   </Tooltip>
 *
 * Props:
 *   label    — required, the headline (e.g. "Revenue")
 *   sublabel — optional, a one-liner under it (e.g. "sales, marketing")
 *   position — 'top' | 'bottom' | 'left' (default 'top'). 'right' is
 *              omitted on purpose — most of our tooltips are at the far-
 *              right edge of a row and a right-aligned bubble would clip.
 *
 * Tooltip becomes pointer-events-none when hidden so it doesn't intercept
 * clicks on whatever's underneath the trigger.
 */

export default function Tooltip({ label, sublabel, position = 'top', children }) {
  const placement = POSITION[position] || POSITION.top
  return (
    <span className="relative inline-flex items-center group/tt">
      {children}
      <span
        role="tooltip"
        className={`
          pointer-events-none absolute z-50 whitespace-nowrap
          px-2.5 py-1.5 rounded-md
          bg-ink-900 text-white text-[11px] leading-tight
          shadow-lg
          opacity-0 group-hover/tt:opacity-100
          translate-y-1 group-hover/tt:translate-y-0
          transition-all duration-150
          ${placement}
        `}
      >
        <span className="font-semibold block">{label}</span>
        {sublabel && (
          <span className="block text-ink-300 font-normal mt-0.5">{sublabel}</span>
        )}
      </span>
    </span>
  )
}

const POSITION = {
  top:           'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
  bottom:        'top-full    mt-1.5 left-1/2 -translate-x-1/2',
  // bottom-right anchors the tooltip's RIGHT edge to the trigger's right
  // edge, so triggers near the page's right edge don't push the bubble
  // off-screen. Use this for the category dot (far right of the row).
  'bottom-right':'top-full    mt-1.5 right-0',
  'top-right':   'bottom-full mb-1.5 right-0',
  left:          'right-full  mr-1.5 top-1/2  -translate-y-1/2',
}
