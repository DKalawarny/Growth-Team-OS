import ToolDisclaimer from './ToolDisclaimer'

/**
 * NewsletterView — read-only render of a saved Team Newsletter.
 *
 * Mirrors the editable card in /tools/newsletter, minus the inputs. Used by
 * the Documents slide-over so an owner can re-read what was sent without
 * regenerating it.
 */
export default function NewsletterView({ data }) {
  if (!data) return null
  const { subject, sections = [], sign_off } = data

  return (
    <div className="space-y-4">
      <div className="bg-white border border-ink-100 rounded-2xl shadow-sm overflow-hidden">
        {subject && (
          <div className="flex items-center gap-3 px-6 py-3.5 bg-ink-50 border-b border-ink-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400 flex-shrink-0">
              Subject
            </span>
            <span className="text-sm font-semibold text-ink-900">{subject}</span>
          </div>
        )}

        <div className="divide-y divide-ink-50">
          {sections.map((s, i) => (
            <div key={i} className="px-8 py-5">
              {s.heading && (
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-ink-400 mb-2.5">
                  {s.heading}
                </p>
              )}
              {s.body && (
                <p className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap">
                  {s.body}
                </p>
              )}
            </div>
          ))}

          {sign_off && (
            <div className="px-8 py-5 bg-ink-50/50">
              <p className="text-sm text-ink-600 italic whitespace-pre-wrap">{sign_off}</p>
            </div>
          )}
        </div>
      </div>

      <ToolDisclaimer toolId="team-newsletter" />
    </div>
  )
}
