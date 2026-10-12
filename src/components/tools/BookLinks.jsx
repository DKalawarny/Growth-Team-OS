import { getBookLink, AFFILIATE_DISCLOSURE, AFFILIATE_ACTIVE } from '../../lib/affiliateLinks'
import { matchBooks, textOf } from '../../lib/bookMatch'

/**
 * Book suggestions at the foot of a result, shown only when they fit.
 *
 * ⚠️ 11 Oct 2026, Daniel: "I want them to come up when it applies." The model
 * used to be asked for a few titles and whatever it returned was shown. Now
 * the result itself is read against the verified list (lib/bookMatch.js): a
 * book appears when the situation it is for is on the page, with the reason
 * beside it, and nothing appears when nothing fits.
 *
 *   data     the tool result; its text is what gets matched
 *   prefer   topics this page leans toward (a head start, not a pass)
 *   max      how many to show
 *
 * The model's own `books` field is ignored on purpose. It could name titles
 * outside the verified list, which is the exact failure the list exists for.
 */
export default function BookLinks({ data, text, prefer = [], max = 2, title = 'Worth reading on this' }) {
  const found = matchBooks(text ?? textOf(data), { prefer, max })
  if (found.length === 0) return null
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <ul className="space-y-2">
        {found.map(b => {
          const link = getBookLink(b.title, b.author)
          return (
            <li key={b.title} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <span aria-hidden className="text-lg leading-none mt-0.5">📖</span>
              <div className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-sm font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2"
                >
                  {b.title}
                </a>
                <span className="text-sm text-gray-600">, {b.author}</span>
                <p className="text-sm text-gray-700 leading-snug mt-0.5">Suggested {b.because}.</p>
              </div>
            </li>
          )
        })}
      </ul>
      {AFFILIATE_ACTIVE && <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">{AFFILIATE_DISCLOSURE}</p>}
    </section>
  )
}
