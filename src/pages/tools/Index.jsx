import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { fetchIntegration } from '../../lib/quickbooks'

/**
 * /tools — the index of everything the product can do.
 *
 * ⭐ REBUILT Aug 2026. What was wrong was not the styling.
 *
 * 1. TWO VOCABULARIES FOR ONE PRODUCT. This page said "CFO Dashboard", "Rocks
 *    Tracker", "Org Chart". SolomonLauncher said "Read this month's numbers to
 *    me", "Set this quarter's priorities", "Plan the team I'll need". Same
 *    destinations, two naming systems, and only one of them is how an owner
 *    actually thinks about his week. The launcher's language wins here, so the
 *    two surfaces stop describing the same thing differently.
 *
 * 2. IT COMPETED WITH SOLOMON INSTEAD OF BACKING HIM UP. The launcher tells
 *    owners these now happen in conversation; this page pretended he did not
 *    exist. Solomon is the front door now and the page says so, then offers
 *    the direct route for people who already know what they want.
 *
 * 3. A GRID OF THIRTEEN CARDS IS A MENU, NOT AN ANSWER. Cards in a grid ask
 *    you to compare before choosing. A grouped list of jobs is scanned. Same
 *    information, far less work to use.
 *
 * ⚠️ DO NOT DELETE THIS PAGE — it is the Cancel destination for eight tool
 * pages.
 *
 * ⭐ CUT TO ELEVEN, Aug 2026. It listed sixteen. Four of those — job autopsy,
 * both scorecards, pipeline-to-hire — were 27-line files containing nothing
 * but an advert for ProSuite, a partner system that is not happening. A fifth,
 * L10, was an 8-line stub. They were not tools; they were placeholders wearing
 * tool names, and they made the product look padded.
 *
 * GBP is also off this list. It still works and its route remains, but it is
 * the local-SEO tool from the old positioning and is marketed nowhere.
 *
 * The list below is deliberately hand-written rather than generated from
 * lib/tools.js. The registry holds routes and status; how a job is DESCRIBED
 * to an owner is editorial, and it should be written, not derived.
 */

// Groups and labels mirror SolomonLauncher exactly. If you change one, change
// both — that shared vocabulary is the entire point of this rebuild.
const GROUPS = [
  {
    title: 'Money',
    items: [
      { label: 'Forecast cash further out',       note: 'Thirteen weeks out, so payroll week never arrives as a surprise.', to: '/tools/cash-flow', needsQbo: true },
      { label: 'Read this month’s numbers to me', note: 'The month in plain English — what changed, and what to do about it.', to: '/tools/cfo', needsQbo: true },
      { label: 'Price something honestly',        note: 'What the work is genuinely worth. Neither gouging nor underselling.', to: '/tools/offer-builder' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Think through a hire',         note: 'Whether to, what the role really is, and what to look for in the person.', to: '/tools/hiring' },
      { label: 'Plan the team I’ll need',      note: 'What the team should look like in twelve months, and the order to build it.', to: '/tools/org-chart' },
      { label: 'Draft an update for the team', note: 'Say where things are heading, in words you would be happy to have repeated.', to: '/tools/newsletter' },
    ],
  },
  {
    title: 'The business',
    items: [
      { label: 'Work through a decision',        note: 'Argued more than one way, with where it lands and what it cannot see.', to: '/tools/decision' },
      { label: 'Set this quarter’s priorities',  note: 'The two or three that matter — and an honest word if it is too many.', to: '/tools/rocks' },
      { label: 'Write down a repeating job',     note: 'Get it out of your head and onto paper, so the business can run without you.', to: '/playbooks' },
      { label: 'Check an obligation',            note: 'Answered from your own documents and the actual regulation, source shown.', to: '/tools/safety' },
      { label: 'Think about who runs this next', note: 'What would have to be true for someone else to run it, and how far off that is.', to: '/tools/exit-readiness' },
    ],
  },
]

export default function ToolsIndex() {
  const { profile } = useAuth()
  const [qbo, setQbo] = useState(null)   // null = unknown, then true / false

  useEffect(() => {
    if (!profile?.company_id) return
    let cancelled = false
    fetchIntegration(profile.company_id, 'quickbooks')
      .then(row => { if (!cancelled) setQbo(Boolean(row)) })
      .catch(() => { if (!cancelled) setQbo(false) })
    return () => { cancelled = true }
  }, [profile?.company_id])

  return (
    <div className="px-6 sm:px-10 py-12">
      <div className="max-w-[680px] mx-auto">

        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-3">
            Everything it can do
          </p>
          <h1 className="font-serif text-[34px] leading-[1.2] text-ink-900 mb-4">
            Ask Solomon, or go straight to it.
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-500">
            He can run most of these in conversation, with your numbers already
            loaded — that is usually the shorter path.{' '}
            <Link to="/advisor" className="text-brand-700 font-semibold underline underline-offset-2">
              Talk to Solomon
            </Link>
            . If you already know what you want, everything is listed here and
            saves to your{' '}
            <Link to="/documents" className="underline underline-offset-2 hover:text-ink-700">
              documents
            </Link>.
          </p>
        </header>

        {/* Only once known — flashing "not connected" at someone who is
            connected reads as a bug. */}
        {qbo === false && (
          <div className="mb-10 rounded-xl border border-ink-200 bg-ink-50 px-5 py-4">
            <p className="text-[14px] text-ink-700 leading-relaxed">
              <strong className="font-semibold">QuickBooks is not connected.</strong>{' '}
              The two money tools below work from your real books once it is —
              until then you enter the figures by hand.{' '}
              <Link to="/settings/integrations" className="text-brand-700 font-semibold underline underline-offset-2">
                Connect it
              </Link>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-10">
          {GROUPS.map(group => (
            <section key={group.title}>
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-400 mb-3">
                {group.title}
              </h2>
              <div className="bg-white border border-ink-100 rounded-2xl overflow-hidden">
                {group.items.map((item, i) => (
                  <ToolRow key={item.to} item={item} first={i === 0} qbo={qbo} />
                ))}
              </div>
            </section>
          ))}

        </div>

      </div>
    </div>
  )
}

function ToolRow({ item, first, qbo }) {
  return (
    <Link
      to={item.to}
      className={`flex items-baseline justify-between gap-4 px-5 py-4 transition-colors hover:bg-ink-50 ${first ? '' : 'border-t border-ink-100'}`}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink-900 leading-snug">
          {item.label}
          {item.needsQbo && qbo === false && (
            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              needs QuickBooks
            </span>
          )}
        </span>
        <span className="block text-[13px] text-ink-500 leading-snug mt-0.5">
          {item.note}
        </span>
      </span>
      <span aria-hidden className="text-ink-300 flex-shrink-0">→</span>
    </Link>
  )
}
