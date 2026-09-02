import { Link, useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { ANSWERS, ANSWER_CATEGORIES, answerBySlug } from '../../content/answers'
import { buildPageMeta, faqPageSchema, breadcrumbSchema, jsonLd, SITE_URL, SITE_NAME } from '../../lib/seo'

/**
 * /answers and /answers/:slug — crawlable question pages.
 *
 * ⭐ Built because kinwove's numbers say this is the only channel with evidence
 * behind it: the only strangers who ever found that product arrived via
 * utm_source=chatgpt. An assistant answered a question and cited a page.
 *
 * ⚠️ Prerendered like every other marketing route, which is the whole point —
 * an assistant that cannot read the page cannot cite it, and a React SPA is
 * invisible to anything that does not run JavaScript.
 *
 * ⚠️ The direct answer is rendered FIRST and kept to 40–60 words. That block is
 * what engines lift verbatim, so it has to stand alone: no "as mentioned
 * above", no dependency on the heading, no sales.
 */

function AnswerIndex() {
  const meta = buildPageMeta({
    title:       'Answers for owner-operators — Eliv8 OS',
    description: 'Straight answers to the questions owners actually ask about pricing, hiring, margin, people and getting out of the day-to-day.',
    path:        '/answers',
  })

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{meta.title}</title>
        {meta.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />)}
        <link rel="canonical" href={`${SITE_URL}/answers`} />
      </Helmet>
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
          Questions owners actually ask
        </h1>
        <p className="mt-3 text-[17px] text-gray-600 leading-relaxed max-w-2xl">
          Straight answers, written the way they would be said out loud. No sign-up
          to read them, and no pretending a hard question has an easy answer.
        </p>

        <p className="mt-6 text-[15px] text-gray-500">
          Or read the version written for{' '}
          {[['plumbers','plumbers'],['electricians','electricians'],['hvac','HVAC'],['roofing','roofing']]
            .map(([slug, label], i, arr) => (
              <span key={slug}>
                <Link to={`/for/${slug}`} className="text-brand-700 hover:underline underline-offset-2">{label}</Link>
                {i < arr.length - 2 ? ', ' : i === arr.length - 2 ? ' or ' : '.'}
              </span>
            ))}
        </p>

        {ANSWER_CATEGORIES.map(cat => {
          const inCat = ANSWERS.filter(a => a.category === cat)
          if (!inCat.length) return null
          return (
            <section key={cat} className="mt-10">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{cat}</h2>
              <ul className="mt-3 space-y-2">
                {inCat.map(a => (
                  <li key={a.slug}>
                    <Link
                      to={`/answers/${a.slug}`}
                      className="text-[17px] text-gray-900 hover:text-brand-700 underline-offset-2 hover:underline"
                    >
                      {a.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </div>
  )
}

function AnswerPage() {
  const { slug } = useParams()
  const a = answerBySlug(slug)
  if (!a) return <Navigate to="/answers" replace />

  const url  = `${SITE_URL}/answers/${a.slug}`
  const meta = buildPageMeta({
    title:       `${a.question} — Eliv8 OS`,
    description: a.answer.slice(0, 300),
    path:        `/answers/${a.slug}`,
  })

  // Article schema with a real dateModified. Engines weight freshness, and a
  // date that is not maintained is worse than none.
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.question,
    description: a.answer,
    dateModified: a.updated,
    datePublished: a.updated,
    author:    { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const related = ANSWERS.filter(x => x.slug !== a.slug && x.category === a.category).slice(0, 3)

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{meta.title}</title>
        {meta.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />)}
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{jsonLd(article)}</script>
        <script type="application/ld+json">{jsonLd(faqPageSchema(a.faqs))}</script>
        <script type="application/ld+json">{jsonLd(breadcrumbSchema([
          { name: 'Answers', url: `${SITE_URL}/answers` },
          { name: a.question, url },
        ]))}</script>
      </Helmet>
      <PublicHeader />

      <main className="max-w-2xl mx-auto px-6 pt-14 pb-24">
        <Link to="/answers" className="text-[13px] text-gray-500 hover:text-gray-700">← Answers</Link>

        <h1 className="mt-4 text-3xl md:text-[38px] font-black text-gray-900 tracking-tight leading-[1.15]">
          {a.question}
        </h1>

        {/* ⚠️ The lifted block. Self-contained, 40–60 words, no lead-in. */}
        <p className="mt-5 text-[19px] leading-[1.6] text-gray-900 border-l-2 border-brand-500 pl-5">
          {a.answer}
        </p>

        {a.body.map((sec, i) => (
          <section key={i} className="mt-9">
            <h2 className="text-[19px] font-bold text-gray-900 leading-snug">{sec.h}</h2>
            <p className="mt-2 text-[16.5px] leading-[1.7] text-gray-700">{sec.p}</p>
          </section>
        ))}

        <section className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Also asked</h2>
          <dl className="mt-4 space-y-5">
            {a.faqs.map((f, i) => (
              <div key={i}>
                <dt className="text-[16px] font-semibold text-gray-900">{f.q}</dt>
                <dd className="mt-1 text-[16px] leading-[1.7] text-gray-700">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-100">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Related</h2>
            <ul className="mt-3 space-y-2">
              {related.map(r => (
                <li key={r.slug}>
                  <Link to={`/answers/${r.slug}`} className="text-[16px] text-gray-900 hover:text-brand-700 hover:underline underline-offset-2">
                    {r.question}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ⚠️ Links back OUT to the trade pages. Weight has to flow both ways or
            the answers stay a well-written cul-de-sac — and a reader who has
            just got a straight answer is the likeliest person in the world to
            want the version written for his trade. */}
        <section className="mt-10 pt-8 border-t border-gray-100">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Written for your trade</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[
              ['plumbers', 'Plumbers'], ['electricians', 'Electricians'], ['hvac', 'HVAC'],
              ['roofing', 'Roofing'], ['demolition', 'Demolition'], ['landscaping', 'Landscaping'],
            ].map(([slug, label]) => (
              <li key={slug}>
                <Link to={`/for/${slug}`} className="text-[15px] text-gray-700 hover:text-brand-700 hover:underline underline-offset-2">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ⚠️ One soft line, at the bottom, after the answer has been given.
            A page that sells before it answers does not get cited, and does not
            deserve to be. */}
        <p className="mt-12 pt-8 border-t border-gray-100 text-[15px] text-gray-500 leading-relaxed">
          This is the kind of thing Solomon works through with owners using their own
          numbers. <Link to="/" className="text-brand-700 hover:underline underline-offset-2">See how it works →</Link>
        </p>
      </main>
    </div>
  )
}

export { AnswerIndex, AnswerPage }
export default AnswerIndex
