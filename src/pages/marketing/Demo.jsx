import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import DecisionView from '../../components/tools/DecisionView'
import { buildPageMeta, SITE_NAME } from '../../lib/seo'

/**
 * /demo — a walkthrough Daniel can hand to someone without giving them a login.
 *
 * ⭐ TWO RULES THIS PAGE IS BUILT AROUND.
 *
 * 1. EVERY NUMBER HERE IS INVENTED, AND THE PAGE SAYS SO — twice, in plain
 *    sight, not in a footnote. This session already had to delete a fabricated
 *    founder story from /about that had been live for months. A demo full of
 *    realistic figures is the same trap wearing a different hat: it is only
 *    honest while the reader knows it is an example. Bridgewater Mechanical
 *    does not exist. There are no testimonials on this page and there will not
 *    be any until real customers give real quotes with their real names.
 *
 * 2. IT RENDERS THE REAL COMPONENTS. The decision below is the actual
 *    DecisionView from the product, fed seeded data — not a screenshot and not
 *    a mock-up that will drift the first time the real one changes. What a
 *    visitor sees here is what they get when they sign in, which is the only
 *    kind of demo worth showing to someone who will later be a user.
 *
 * The example was chosen to be a mid-size trades business because that is the
 * network Daniel actually has, but the page never claims trades are the niche —
 * the buyer is defined by conviction, not sector. See lib/seo.js.
 */

const DEMO_META = buildPageMeta({
  title:       `See it work — ${SITE_NAME}`,
  description: 'A worked example: what Solomon says when an owner asks whether to hire, using a fictional company\'s real-shaped numbers.',
  path:        '/demo',
})

// ── The example company ───────────────────────────────────────────────────────
// Invented. Deliberately NOT Deconstructors — that is a real company Daniel is
// exiting, and using it here would imply a customer relationship and a
// endorsement that do not exist.
// ⚠️ The article before CO.trade is hardcoded as "a" in the copy below. It read
// "an commercial HVAC…" on the live page until this was caught. If you change
// `trade` to something vowel-initial, fix the article too — this is prose, not
// a template engine, and it will not do it for you.
const CO = {
  name:     'Bridgewater Mechanical',
  trade:    'commercial HVAC and refrigeration',
  where:    'Kamloops, BC',
  people:   11,
  revenue:  '$3.4M',
  margin:   '7%',
}

const NUMBERS = [
  { label: 'Revenue, trailing 12',  value: '$3.4M',  note: 'up 18% on last year' },
  { label: 'Net margin',            value: '7%',     note: 'down from 11%' },
  { label: 'Cash on hand',          value: '$81k',   note: '5.5 weeks of payroll' },
  { label: 'Receivables over 60d',  value: '$134k',  note: '61% sits with two GCs' },
]

// The real Advisor conversation shape, abbreviated.
const CHAT = [
  { role: 'user', text: 'Should I take on the Riverside contract? It’s $480k over eight months.' },
  {
    role: 'assistant',
    text: 'Before the yes or no — that contract is 14% of your trailing revenue and Riverside pays on 60-day terms. You are already carrying $134k over 60 days, and $82k of that is one GC.\n\nSo the real question is not whether the work is good. It is whether you can float eight months of labour and materials while your two slowest payers are already sitting on six weeks of your cash.\n\nWhat are their payment terms, and is there a holdback?',
  },
  { role: 'user', text: '60 days, 10% holdback until substantial completion.' },
  {
    role: 'assistant',
    text: 'Then at peak you would be out roughly $95k–$110k before the first cheque clears, and the holdback keeps $48k out of reach until the end.\n\nYou have $81k on hand. That does not work without either a deposit, a draw schedule, or the overdraft — and using the overdraft to fund a contract at 7% margin means the financing cost eats a meaningful slice of the profit.\n\nI would go back to Riverside and ask for a 15% mobilisation deposit and monthly draws. If they say no to both, this contract is a cash-flow problem wearing a revenue costume.\n\nThat is a read on the figures you have given me — your bookkeeper should confirm the receivables ageing before you sign anything.',
  },
]

// Real shape, fed to the real component.
const DECISION = {
  decision: 'Whether to hire a second service tech or keep running overtime',
  stakes:   'Overtime is currently costing about $6,200 a month and is concentrated on two people. A tech is roughly $78k all-in. The question is not really the money, it is whether the work is durable enough to carry a permanent seat.',
  angles: [
    {
      name:          'The cash case',
      leaning:       'against',
      argument:      'At 7% net margin a $78k seat needs about $1.1M of additional revenue to carry itself before it improves anything. You do not have that booked — you have it hoped for. Overtime is expensive per hour but it is variable, and variable is what a business with 5.5 weeks of cash should be buying right now.',
      weakest_point: 'This treats the overtime as if it were free of risk. It is not — it is concentrated on two people, and if either leaves the cost of replacing them lands all at once.',
    },
    {
      name:          'The people case',
      leaning:       'for',
      argument:      'Both techs carrying the overtime are past nine months of it. That is the point where good people start taking calls from competitors, and losing either one costs you more than the seat does — a replacement search, six weeks of reduced capacity, and the institutional knowledge that walks out with them.',
      weakest_point: 'You have not actually asked them how they feel about it. This is inferred from the hours, not from a conversation, and the conversation is free.',
    },
    {
      name:          'The margin case',
      leaning:       'mixed',
      argument:      'Margin fell from 11% to 7% while revenue rose 18%. That pattern usually means the extra work is being won at prices that do not carry the cost of delivering it. Another tech would add capacity to a machine that is currently converting growth into less profit, which is not obviously an improvement.',
      weakest_point: 'The margin drop might be materials inflation rather than pricing, in which case hiring is neutral to it and this angle is aimed at the wrong problem.',
    },
  ],
  conflict: 'The cash case and the people case point in opposite directions, and both are right. The tension is real: the safest thing for the balance sheet this quarter is also the thing most likely to cost you a tech next quarter.',
  landing: {
    recommendation: 'Do not hire yet. Have the conversation with both techs this week, and fix the pricing before you add capacity to it.',
    reasoning:      'The margin drop is the actual problem — a second tech added to 7% work produces more 7% work. Find out whether the drop is pricing or materials first, because that answer changes what the right hire even is. Meanwhile the retention risk is real but it is not yet a resignation, and a direct conversation buys you information for nothing.',
    my_weakest_point: 'I am assuming you have four to six weeks before the retention risk becomes a resignation. If either tech is already interviewing, this recommendation is wrong and the sequencing should flip.',
  },
  cannot_see: [
    'Whether the two techs are actually unhappy, or just tired in a way that passes',
    'Whether the margin drop is pricing, materials, or job mix — your books would tell you and I have not seen the job-level costing',
    'What is in your pipeline past the next eight weeks',
  ],
  next_asks: [
    { ask: 'Pull the last six months of job costing and split margin by job type', why: 'Tells you whether the drop is pricing or a specific kind of work' },
    { ask: 'Ask both techs directly how long they want to keep this up', why: 'Costs nothing and replaces the biggest assumption in this answer' },
    { ask: 'Confirm the Riverside terms before it changes the cash picture', why: 'A $480k contract on 60-day terms would change what you can afford' },
  ],
  drawn_from: ['Your QuickBooks figures', 'Roadmap milestones', '9 months of overtime records', 'Two earlier conversations about pricing'],
}

export default function Demo() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{DEMO_META.title}</title>
        <link rel="canonical" href={DEMO_META.canonical} />
        {DEMO_META.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
      </Helmet>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-14">

        <header className="mb-10">
          <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-3">A worked example</p>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-[1.1] mb-5">
            What it actually looks like<br />when you ask.
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Below is a real walkthrough of the product — the same screens and the
            same components a signed-in owner sees. The only difference is that
            the business is made up.
          </p>
        </header>

        {/* Said plainly, up top, where nobody can miss it. */}
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5 mb-12">
          <p className="text-[15px] text-gray-800 leading-relaxed">
            <strong>{CO.name} is not a real company.</strong> Every figure on this
            page is invented to show the shape of a real answer. We would rather
            show you a fiction that is clearly labelled than a customer&rsquo;s
            books, or a testimonial we do not have yet.
          </p>
        </div>

        {/* ── The setup ───────────────────────────────────────────────────── */}
        <Step n="1" title="What Solomon already knows">
          <p className="text-gray-700 leading-relaxed mb-5">
            {CO.name} is a {CO.trade} contractor in {CO.where} — {CO.people} people,
            about {CO.revenue} a year at {CO.margin} net. The owner connected
            QuickBooks and answered the setup questions once. Nothing here was
            re-typed for this conversation.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {NUMBERS.map(n => (
              <div key={n.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{n.label}</p>
                <p className="text-xl font-black text-gray-900 tabular-nums leading-none mb-1.5">{n.value}</p>
                <p className="text-[11px] text-gray-500 leading-snug">{n.note}</p>
              </div>
            ))}
          </div>
        </Step>

        {/* ── The conversation ────────────────────────────────────────────── */}
        <Step
          n="2"
          title="He answers the question underneath the question"
          blurb="The owner asks about a contract. Solomon starts with the thing that actually decides it — and ends by naming what he has not checked."
        >
          <div className="rounded-2xl border border-gray-200 bg-[#F6F8F8] p-4 sm:p-5 flex flex-col gap-3">
            {CHAT.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[18px] rounded-br-[4px] bg-ink-900 text-white px-4 py-2.5 text-sm leading-relaxed">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div
                    className="max-w-[92%] rounded-[18px] rounded-bl-[4px] px-5 py-4 font-serif text-[16px] leading-[1.62] whitespace-pre-line"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(13,20,19,0.09)', color: '#1B2422' }}
                  >
                    {m.text}
                  </div>
                </div>
              )
            ))}
          </div>
          <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
            Note the last line of his answer. Solomon names the figure he is
            relying on and who should check it, because an answer you cannot
            audit is not much use.
          </p>
        </Step>

        {/* ── The decision tool — the REAL component ───────────────────────── */}
        <Step
          n="3"
          title="On the hard calls, he argues it more than one way"
          blurb="This is the actual output, rendered by the same component the product uses. He gives every angle its own weakest point, says where he lands, and lists what he cannot see."
        >
          <div className="rounded-2xl border border-gray-200 bg-[#F6F8F8] p-4 sm:p-6">
            <DecisionView result={DECISION} />
          </div>
        </Step>

        {/* ── Memory ──────────────────────────────────────────────────────── */}
        <Step
          n="4"
          title="And he remembers it next month"
          blurb="Decisions, constraints, people and commitments carry forward. You do not re-explain your business every time you open it."
        >
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {[
              ['Decision', 'Held off hiring a second tech in August pending job-costing review'],
              ['Constraint', 'Will not use the overdraft to fund contract work'],
              ['Person', 'Two service techs carrying sustained overtime since November'],
              ['Commitment', 'Pricing review before adding any capacity'],
            ].map(([kind, text]) => (
              <div key={text} className="flex gap-4 px-5 py-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-700 pt-1 w-20 flex-shrink-0">{kind}</span>
                <span className="text-[14px] text-gray-700 leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
            If the owner later says something that contradicts one of these,
            Solomon says so rather than quietly going along with it.
          </p>
        </Step>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="mt-14 pt-10 border-t border-gray-200 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">
            Your numbers, your business, same treatment.
          </h2>
          <p className="text-gray-600 mb-7 max-w-lg mx-auto leading-relaxed">
            GrowthOS is in private pilot and free while it is. No card, and
            nothing is charged.
          </p>
          <Link
            to="/signup"
            className="inline-block px-9 py-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-colors"
          >
            Start free
          </Link>
          <p className="text-[12px] text-gray-400 mt-5">
            See the{' '}
            <Link to="/terms" className="underline hover:text-gray-600">pilot agreement</Link>
            {' '}·{' '}
            <Link to="/pricing" className="underline hover:text-gray-600">what is included</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

function Step({ n, title, blurb, children }) {
  return (
    <section className="mb-14">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[13px] font-black text-brand-600 tabular-nums">{n}</span>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{title}</h2>
      </div>
      {blurb && <p className="text-gray-500 leading-relaxed mb-5 pl-7">{blurb}</p>}
      <div className="pl-0 sm:pl-7">{children}</div>
    </section>
  )
}
