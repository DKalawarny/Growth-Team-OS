import { Helmet } from 'react-helmet-async'
import { Link, useParams, Navigate } from 'react-router-dom'
import WayoutShell from './WayoutShell'
import { SITUATIONS, SITUATION_BY_SLUG } from '../../content/unstuckSituations'
import { WAYOUT_BASE, WAYOUT_NAME_TITLE, WAYOUT_SITE_URL } from '../../lib/wayout/brand'

/**
 * ⭐⭐ THE ONLY PAGES IN THIS PRODUCT BUILT TO BE FOUND. Everything else is
 * noindex and behind a session, for good reason — a plan holds somebody's money
 * and what they are running from. These are the door.
 *
 * ⚠️ THEY ARE NOT LANDING PAGES. A landing page answers "what is this product",
 * which nobody types. These answer what somebody actually types at eleven at
 * night, and the test is strict: could a person who will never pay a cent read
 * this and be genuinely better off? If not it does not belong here — that is
 * exactly what an assistant is choosing between, and withholding the useful
 * part to drive a signup loses the citation and the trust at the same time.
 */

const json = o => JSON.stringify(o, null, 2)

export function SituationIndex() {
  const title = `Being stuck, in specific situations — ${WAYOUT_NAME_TITLE}`
  return (
    <WayoutShell noindex={false} canonicalPath="/stuck" wide>
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content="Straight answers to specific situations — an inherited house with debt against it, working nights, a loan against a lump of money."
        />
      </Helmet>

      <h2 className="wayout__r">Situations, answered straight</h2>
      <p className="wayout__lead wayout__r">
        Not advice, and not a lecture on budgeting. What the decision actually
        turns on, what the number really is, and what order things go in.
      </p>

      <div className="wayout__board" style={{ marginTop: 34 }}>
        {SITUATIONS.map(s => (
          <Link key={s.slug} to={`${WAYOUT_BASE}/stuck/${s.slug}`} className="wayout__card wayout__situationcard">
            <b>{s.intro}</b>
            <h3>{s.question}</h3>
            <p>{s.answer.slice(0, 130)}…</p>
          </Link>
        ))}
      </div>
    </WayoutShell>
  )
}

export function SituationPage() {
  const { slug } = useParams()
  const s = SITUATION_BY_SLUG[slug]
  if (!s) return <Navigate to={`${WAYOUT_BASE}/stuck`} replace />

  const url = `${WAYOUT_SITE_URL}${WAYOUT_BASE}/stuck/${s.slug}`

  // ⚠️ dateModified is real and comes from the entry. Engines weight freshness,
  // and a date that does not move while the page does is worse than none.
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: s.question,
    description: s.answer,
    dateModified: s.updated,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: { '@type': 'Organization', name: WAYOUT_NAME_TITLE, url: WAYOUT_SITE_URL },
  }
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: s.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <WayoutShell noindex={false} canonicalPath={`${WAYOUT_BASE}/stuck/${s.slug}`} wide title={s.question}>
      <Helmet>
        <meta name="description" content={s.answer} />
        <script type="application/ld+json">{json(article)}</script>
        <script type="application/ld+json">{json(faq)}</script>
      </Helmet>

      <p className="wayout__who wayout__r">{s.intro}</p>
      <h2 className="wayout__r">{s.question}</h2>

      {/* ⭐ The 40–60 word block an assistant lifts. First, self-contained, and
          it answers the question rather than teasing it. */}
      <div className="wayout__seen wayout__r" style={{ marginTop: 18 }}>
        <b>{s.answer}</b>
      </div>

      <div className="wayout__situationbody">
        {s.body.map((b, i) => (
          <section key={i} className="wayout__r">
            <h3>{b.h}</h3>
            <p>{b.p}</p>
          </section>
        ))}
      </div>

      <h3 className="wayout__label" style={{ marginTop: 38 }}>Questions people ask next</h3>
      <div className="wayout__situationfaq">
        {s.faqs.map((f, i) => (
          <section key={i}>
            <h4>{f.q}</h4>
            <p>{f.a}</p>
          </section>
        ))}
      </div>

      {/* ⚠️ The ask, AFTER the answer and never instead of it. What a page
          cannot do is run any of this against their actual figures — that is
          the honest difference, and it is what the offer says. */}
      <div className="wayout__offer wayout__r" style={{ marginTop: 40 }}>
        <span className="wayout__offerkick">If this is your situation</span>
        <h3>Run it against your own numbers</h3>
        <p className="wayout__offerlead">
          Everything above is the shape of the decision. What it cannot do is use
          your figures. It narrows four ways out to the one that fits you, then turns
          that into three moves in the order they work — free, and yours to keep.
        </p>
        {/* 🔴 "Start with six questions" was the same untruth as the landing page
            carried, on all 16 of these pages. Six taps name a DIRECTION; the three
            moves promised in the sentence above come from the questions after
            that. Nobody is going to feel cheated by a button — they feel it at
            minute four, having been told the whole thing was six taps. */}
        <Link className="wayout__btn wayout__btn--sun" to={`${WAYOUT_BASE}/start`}>
          Show me which way
        </Link>
        <p className="wayout__offerfine">Free. No card, and no account to begin.</p>
      </div>

      <p className="wayout__disclaimer wayout__r">
        This is general information about how these decisions work, not financial,
        legal or tax advice. Check the numbers against your own situation before
        you act.
      </p>
    </WayoutShell>
  )
}

export default SituationIndex
