import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, SITE_NAME, CONTACT_EMAIL } from '../../lib/seo'
import {
  TERMS_VERSION,
  OPERATOR_LEGAL_NAME,
  GOVERNING_PROVINCE,
  LIABILITY_CAP_CAD,
} from '../../lib/terms'

/**
 * /terms — the pilot agreement.
 *
 * ⚠️ THIS IS A PILOT AGREEMENT, NOT A FINISHED SAAS TOS. It is written for the
 * period BEFORE the company exists and before anyone is charged. When either
 * of those changes, this needs replacing, not patching:
 *
 *   - Taking money adds refunds, billing, auto-renewal, cancellation, and
 *     consumer-protection obligations that are not in here at all.
 *   - Incorporating changes who the counterparty is. See lib/terms.js.
 *
 * ⭐ It is deliberately plain English. Not because plain English is legally
 * weaker — it is not — but because the whole product is premised on not
 * telling people things that are not so, and a wall of unread capitals sits
 * badly against that. A pilot user who actually reads this and decides the
 * risk is not for them is a GOOD outcome.
 *
 * ⚠️ The limitation-of-liability and indemnity sections are where a lawyer
 * earns their fee, especially for a product that advises on money and
 * touches safety-compliance topics. This is a solid, honest starting draft.
 * It is not a substitute for that review.
 */

const TERMS_META = buildPageMeta({
  title:       `Pilot agreement — ${SITE_NAME}`,
  description: 'The agreement covering the private GrowthOS pilot: what it is, what it is not, and how liability is handled during an unpaid evaluation.',
  path:        '/terms',
})

// Effective date is tied to the version, not to today, so the page cannot
// silently claim to be newer than the terms actually are.
const EFFECTIVE = '21 August 2026'

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{TERMS_META.title}</title>
        <link rel="canonical" href={TERMS_META.canonical} />
        {TERMS_META.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
      </Helmet>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
          Pilot agreement
        </h1>
        <p className="text-sm text-gray-500 mb-2">
          Version {TERMS_VERSION} · Effective {EFFECTIVE}
        </p>
        <p className="text-gray-700 leading-relaxed mb-10">
          This covers the private {SITE_NAME} pilot. It is an agreement between
          you and <strong>{OPERATOR_LEGAL_NAME}</strong> (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;). Please read it — it is short, and section 4 is the
          one that matters most.
        </p>

        {/* The single most important framing on the page.
            ⚠️ Stated as a boundary, not an apology — see the note in
            components/legal/TermsGate.jsx. Every protective element is here;
            none of it is phrased as a confession of poor quality. */}
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-6 mb-12">
          <p className="font-bold text-gray-900 mb-2">The short version</p>
          <p className="text-gray-800 leading-relaxed text-[15px] mb-3">
            Solomon gives you real business thinking on your real numbers. He works
            from what you give him and what your connected accounts return, so his
            answer is only ever as good as what he can see.
          </p>
          <p className="text-gray-800 leading-relaxed text-[15px]">
            He is not your accountant, lawyer, or regulator, and nothing here is
            professional advice. Every decision is yours and you are responsible
            for it — so where being wrong would be expensive, confirm it with a
            qualified professional or the relevant authority before you act.
          </p>
        </div>

        <Section n="1" title="What the pilot is">
          <p>
            You have been invited to test {SITE_NAME} while it is being built.
            It is free. There is no charge now, and we will not ask you for
            payment details during the pilot.
          </p>
          <p>
            The pilot is private. Please do not share your access, publish
            screenshots, or pass the product around without asking us first.
          </p>
          <p>
            We may change how it works, add or remove features, pause it, or end
            it — for everyone or for you specifically — at any time and without
            notice. That is what a pilot is.
          </p>
        </Section>

        <Section n="2" title="What GrowthOS is not">
          <p>
            <strong>It is not professional advice.</strong> Nothing produced by
            GrowthOS or by Solomon is legal, accounting, tax, financial,
            insurance, employment, or safety-compliance advice, and using it does
            not create a professional or advisory relationship between us.
          </p>
          <p>
            Solomon is an AI. It is designed to decline questions that need a
            lawyer, an accountant, or a regulator, and to point you to the right
            authority instead — but it can still be wrong, out of date, or
            confidently mistaken, including on things it was not designed to
            decline.
          </p>
          <p>
            Anything touching employment law, tax, workplace safety, insurance
            coverage, or contract wording should be confirmed with a qualified
            professional or the relevant authority before you act on it. That
            applies even when GrowthOS sounds certain, and even when it cites a
            source.
          </p>
          <p>
            Financial figures, forecasts, and valuations are estimates built from
            what you told us and what your connected accounts returned. They are
            not audited, not a guarantee, and not a substitute for your
            accountant.
          </p>
        </Section>

        <Section n="3" title="Your decisions are yours">
          <p>
            You are the owner of your business and you make its decisions. Hiring,
            firing, pricing, borrowing, spending, signing, and everything else
            remains entirely your responsibility and your judgement.
          </p>
          <p>
            Please check anything important before acting on it, especially where
            the cost of being wrong is real — payroll, a hire, a contract, a
            regulatory obligation, a price you are about to quote.
          </p>
        </Section>

        <Section n="4" title="No warranty, and limits on what we owe you">
          <p>
            <strong>
              GrowthOS is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo;, with no warranties of any kind, express or
              implied.
            </strong>{' '}
            We do not promise it will be accurate, complete, current, reliable,
            secure, uninterrupted, or fit for any particular purpose.
          </p>
          <p>
            <strong>
              To the fullest extent the law allows, we are not liable for any
              indirect, incidental, special, consequential, or punitive loss
            </strong>{' '}
            — including lost profits, lost revenue, lost or corrupted data, lost
            business or contracts, regulatory penalties, or reputational harm —
            arising from your use of GrowthOS or from any decision you made in
            reliance on it.
          </p>
          <p>
            <strong>
              Our total liability to you for everything connected with the pilot
              is capped at CAD&nbsp;${LIABILITY_CAP_CAD}.
            </strong>{' '}
            The pilot is free, so this cap is not tied to fees paid.
          </p>
          <p className="text-gray-600">
            Some things cannot be excluded by law, and we are not trying to
            exclude them: this section does not limit liability for fraud,
            fraudulent misrepresentation, gross negligence, wilful misconduct, or
            anything else that cannot lawfully be limited. Where your local law
            gives you rights that cannot be waived, those rights still apply and
            nothing here overrides them.
          </p>
        </Section>

        <Section n="5" title="Your data, and keeping your own copies">
          <p>
            What you put in stays yours. We do not sell it, and it is not used to
            train AI models. How it is handled is set out in our{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline">privacy policy</Link>{' '}
            and{' '}
            <Link to="/security" className="text-brand-600 hover:underline">security page</Link>.
          </p>
          <p>
            <strong>
              This is a pilot, so please keep your own copies of anything you
              would be upset to lose.
            </strong>{' '}
            We may need to reset data, migrate it, or clear it out between builds,
            and we do not guarantee backups or recovery during the pilot.
          </p>
          <p>
            If you connect an outside account such as QuickBooks or a cloud drive,
            you confirm you are entitled to connect it and to let us read what it
            returns. You can disconnect it at any time from settings.
          </p>
          <p>
            Do not upload anyone else&rsquo;s personal information without a
            proper basis for doing so — particularly employee records.
          </p>
        </Section>

        <Section n="6" title="Feedback">
          <p>
            The point of a pilot is to find out what is wrong, so tell us. If you
            send us feedback, bug reports, or suggestions, you are giving us
            permission to use them to improve the product, without obligation or
            payment to you. You keep your own business information — this covers
            the suggestions, not your data.
          </p>
        </Section>

        <Section n="7" title="Pricing later, and no promises about it">
          <p>
            The pilot is free and taking part does not entitle you to a free,
            discounted, or grandfathered rate afterwards. If we introduce
            pricing, we will tell you before anything is charged, and you will be
            free to walk away.
          </p>
          <p>
            <strong>
              Nothing will ever be charged to you during the pilot, and no payment
              details will be collected.
            </strong>
          </p>
        </Section>

        <Section n="8" title="Ending it">
          <p>
            You can stop at any time and ask us to delete your account by emailing{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
            We can end your access at any time. Sections 2, 3, 4, and 6 continue
            to apply after the pilot ends.
          </p>
        </Section>

        <Section n="9" title="Changes to this agreement">
          <p>
            If we change this agreement materially, the version number changes and
            you will be asked to accept the new one next time you sign in. We keep
            a record of which version you accepted and when.
          </p>
          <p className="text-gray-600">
            One change is already expected. GrowthOS is being run personally
            during the pilot because the company behind it is not yet
            incorporated. When it is, this agreement will be reissued in the
            company&rsquo;s name and you will be asked to accept that version. We
            are telling you now rather than swapping the name quietly later.
          </p>
        </Section>

        <Section n="10" title="Law">
          <p>
            This agreement is governed by the laws of {GOVERNING_PROVINCE},
            Canada, and the courts of {GOVERNING_PROVINCE} have jurisdiction over
            any dispute. If any part of this agreement is unenforceable, the rest
            still stands.
          </p>
          <p>
            Questions about any of this — including the parts you do not like —
            go to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <div className="mt-14 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-brand-600 hover:underline">Privacy policy</Link>
          <Link to="/security" className="text-brand-600 hover:underline">Security</Link>
          <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ n, title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-black text-gray-900 mb-3">
        <span className="text-brand-600 tabular-nums">{n}.</span> {title}
      </h2>
      <div className="space-y-3 text-[15px] text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  )
}
