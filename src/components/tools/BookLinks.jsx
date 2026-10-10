import { getBookLink, AFFILIATE_DISCLOSURE, AFFILIATE_ACTIVE } from '../../lib/affiliateLinks'

/**
 * Book suggestions at the foot of a tool result, as real links.
 *
 * The roadmap has always linked its books; the tool pages listed the same kind
 * of suggestion as plain text chips that looked clickable and were not
 * (Daniel, 10 Oct: "are we still doing book links?"). One component so the two
 * cannot drift apart again, with the disclosure the links require.
 */
export default function BookLinks({ books = [] }) {
  const links = books.map(b => getBookLink(b)).filter(Boolean)
  if (links.length === 0) return null
  return (
    <div>
      {/* Why they are here, in one line (Daniel: "a short little this will help type thing"). */}
      <p className="text-xs text-gray-500 leading-relaxed mb-2">
        {links.length === 1 ? 'This book goes' : 'These books go'} further into what came up above. Worth a look if you want the thinking behind the advice, not required to act on it.
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((link, i) => (
          <li key={i}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-500 hover:text-brand-700 transition-colors"
            >
              <span aria-hidden>📖</span>
              {link.label}
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M4.5 2h5.5v5.5M10 2L4 8M2 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
      {AFFILIATE_ACTIVE && <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">{AFFILIATE_DISCLOSURE}</p>}
    </div>
  )
}
