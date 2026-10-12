import './wayout.css'

/**
 * The drawn map beside the account forms: three stops between where somebody is
 * and where they want to be. A drawing, never anybody's real plan, so it names
 * no moves and no figures.
 *
 * ⚠️ Wide screens only (the CSS hides it below 1040px). On a phone it would sit
 * between the heading and the form, and the form is what they came for.
 */
export default function RouteMap({ firstDone = false }) {
  return (
    <div className="wayout__entermap" aria-hidden="true">
      <svg viewBox="0 0 460 400" role="presentation">
        <rect x="6" y="6" width="448" height="388" rx="26" className="wayout__mappaper" />
        <path className="wayout__mapland" d="M40 120c30-40 90-50 120-20s20 70-20 90-90 10-110-20 0-40 10-50z" />
        <path className="wayout__mapland" d="M300 250c40-20 100-10 110 30s-30 70-70 70-70-20-70-50 10-40 30-50z" />
        <path className="wayout__mapwater" d="M6 300c60-30 110 20 170 0s90-70 150-60 90-10 128-30v60c-40 20-70 30-120 20s-100 40-160 60-110-20-168-10z" />
        <path className="wayout__mapfold" d="M156 6v388M306 6v388M6 136h448M6 266h448" />
        <path className="wayout__maproute" d="M70 340C120 300 70 250 140 232S250 262 284 204 236 126 322 104 388 86 396 64" />
        <circle cx="70" cy="340" r="15" className="wayout__mapherering" />
        <circle cx="70" cy="340" r="7" className="wayout__maphere" />
        {[[140, 232], [284, 204], [322, 104]].map(([x, y], n) => {
          const done = firstDone && n === 0
          return (
            <g key={n} className={`wayout__mapstop${done ? ' is-done' : ''}`}>
              <circle cx={x} cy={y} r="19" />
              {done
                ? <path d={`M${x - 8} ${y + 1}l6 6 11-12`} />
                : <text x={x} y={y + 6} textAnchor="middle">{n + 1}</text>}
            </g>
          )
        })}
        <path className="wayout__mapflagpole" d="M396 66V26" />
        <path className="wayout__mapflag" d="M396 26l30 9-30 10z" />
        <text className="wayout__maphand" x="96" y="372">You are here</text>
        <text className="wayout__maphand wayout__maphand--to" x="376" y="40" textAnchor="end">Where you want to be</text>
      </svg>
    </div>
  )
}
