import { Link } from 'react-router-dom'

/**
 * What a cash forecast can and cannot see, said out loud.
 *
 * ⚠️ 10 Oct, Daniel: "the headings need context to show how they work... you
 * would need quotes in the app to know upcoming", then: "it's not a CRM but it
 * should be able to see what you have quoted and history from whatever source
 * it's done in." A forecast drew thirteen confident weeks from one uploaded
 * file and said nothing about what was missing. This lists each source, what
 * was found there, and how to add the ones that are empty. It deliberately
 * does not make the owner re-key quotes: they come from his tasks, from an
 * export of whatever he quotes in, or from QuickBooks.
 */
const money = n => `$${Math.round(n).toLocaleString()}`

export default function ForecastSources({ qboConnected, snapshotLabel, financialDocs = [], quoteDocs = [], pipeline = [], typed = null }) {
  const pipelineTotal = pipeline.reduce((a, p) => a + (p.amount ?? 0), 0)
  const rows = [
    {
      title: 'Your books',
      have: qboConnected,
      found: qboConnected ? `QuickBooks, ${snapshotLabel ?? 'latest period'}: profit and loss and balance sheet.` : null,
      missing: 'QuickBooks is not connected.',
      how: <Link to="/settings?tab=integrations" className="font-semibold text-brand-700 hover:text-brand-800">Connect QuickBooks</Link>,
    },
    {
      title: 'Financial files you uploaded',
      have: financialDocs.length > 0,
      found: `${financialDocs.length} file${financialDocs.length === 1 ? '' : 's'}: ${financialDocs.slice(0, 3).map(f => f.title).join(', ')}${financialDocs.length > 3 ? ' and more' : ''}.`,
      missing: 'No statement, P&L or bank export uploaded.',
      how: <Link to="/documents?view=uploaded" className="font-semibold text-brand-700 hover:text-brand-800">Upload one</Link>,
    },
    {
      title: 'What you have quoted and invoiced, from any system',
      have: quoteDocs.length > 0,
      found: `${quoteDocs.length} file${quoteDocs.length === 1 ? '' : 's'}: ${quoteDocs.slice(0, 3).map(f => f.title).join(', ')}${quoteDocs.length > 3 ? ' and more' : ''}.`,
      missing: 'Nothing yet. Export your quotes or unpaid invoices from whatever you quote in (a spreadsheet, your invoicing app, QuickBooks) and upload the file.',
      how: <Link to="/documents?view=uploaded" className="font-semibold text-brand-700 hover:text-brand-800">Upload the export</Link>,
    },
    {
      title: 'Tasks with a quoted amount, not invoiced yet',
      have: pipeline.length > 0,
      found: `${pipeline.length} task${pipeline.length === 1 ? '' : 's'}, ${money(pipelineTotal)} quoted. Counted as likely, not certain.`,
      missing: 'No task has a quoted amount on it.',
      how: <Link to="/board" className="font-semibold text-brand-700 hover:text-brand-800">Add amounts on a task</Link>,
    },
    ...(typed ? [{
      title: 'What you told us is coming',
      have: !!(typed.inflows || typed.outflows),
      found: [typed.inflows && `In: ${typed.inflows}`, typed.outflows && `Out: ${typed.outflows}`].filter(Boolean).join(' · '),
      missing: 'Nothing typed in. Known deposits and big bills go in the form below.',
      how: null,
    }] : []),
  ]
  const haveCount = rows.filter(r => r.have).length

  return (
    <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-100">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">What this forecast can see</h2>
        <p className="text-[12.5px] text-ink-500 mt-0.5 leading-relaxed">
          A forecast only knows what it has been shown. {haveCount} of {rows.length} sources have something in them.
          The more of these are filled, the less of the 13 weeks is a guess.
        </p>
      </div>
      <ul className="divide-y divide-ink-100">
        {rows.map(r => (
          <li key={r.title} className="px-5 py-3 flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${r.have ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-400'}`}
            >
              {r.have ? '✓' : '–'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">{r.title}</p>
              <p className={`text-[13px] leading-relaxed mt-0.5 ${r.have ? 'text-ink-600' : 'text-ink-500'}`}>
                {r.have ? r.found : r.missing} {!r.have && r.how}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
