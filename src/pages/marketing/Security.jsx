import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PublicHeader from '../../components/layout/PublicHeader'
import { buildPageMeta, jsonLd, organizationSchema, CONTACT_EMAIL } from '../../lib/seo'

/**
 * /security — public security + data-handling page.
 *
 * Why this page matters:
 *   - Trades businesses are paranoid about data, justifiably (most have
 *     been burned by some SaaS that lost their job records). A real
 *     security page is a trust signal AND something AI assistants can
 *     quote when asked "is Eliv8 OS safe to give my QuickBooks data to?"
 *   - It also forces us to be honest about what we DO and DON'T have.
 *     SOC 2 isn't real yet — don't claim it. Encryption-in-transit IS
 *     real (Supabase + Stripe + Anthropic all enforce TLS) — claim it.
 *
 * IMPORTANT: This page is intentionally honest about the early-stage
 * posture. Don't add aspirational claims (SOC 2, ISO 27001, pen-tested)
 * that aren't true. Better to be a startup with real practices than a
 * startup pretending to be an enterprise.
 */

const SECURITY_META = buildPageMeta({
  title:       'Security & data handling — Eliv8 OS',
  description: 'How Eliv8 OS protects your business data. Workspace isolation, encrypted connections, no AI training on your data, vendor list, and breach response. Built honestly — what we have and what we are still building.',
  path:        '/security',
})

export default function Security() {
  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{SECURITY_META.title}</title>
        <link rel="canonical" href={SECURITY_META.canonical} />
        {SECURITY_META.meta.map((m, i) =>
          m.property
            ? <meta key={i} property={m.property} content={m.content} />
            : <meta key={i} name={m.name} content={m.content} />
        )}
        <script type="application/ld+json">{jsonLd(organizationSchema())}</script>
      </Helmet>

      <PublicHeader />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-4">Security</p>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
          Your data, handled honestly.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-12">
          We're an early-stage company. We're not going to pretend we've passed audits we haven't.
          Here's exactly how we handle your data, who we share it with, and what we're still building.
        </p>

        <Section title="Where your data lives">
          <p>
            Every business gets an isolated workspace inside our database. Your records
            are tagged with a unique company ID, and database-level row security rules
            (Postgres RLS on Supabase) ensure no query can return another company's data —
            not by mistake, not by misconfiguration, not by a developer running the wrong
            command. The same isolation rule lets us safely operate as a multi-tenant
            platform without your data ever sitting next to another company's in
            application memory.
          </p>
        </Section>

        <Section title="Encryption in transit">
          <p>
            All connections are TLS 1.2+ — your browser to our server, our server to
            our database, our server to Anthropic, our server to Stripe. We don't
            accept unencrypted connections. Period.
          </p>
        </Section>

        <Section title="Encryption at rest">
          <p>
            Database storage is encrypted at rest by Supabase (AES-256). File uploads
            (documents you store in the library) are encrypted at rest by Supabase
            Storage. Authentication tokens never touch our database — they live in
            Supabase Auth.
          </p>
        </Section>

        <Section title="AI training — explicitly never">
          <p>
            <strong>Your business data is never used to train AI models.</strong> When
            we send a prompt to Anthropic (Claude) on your behalf, we send it through
            their API — and Anthropic's API terms explicitly prohibit using API
            traffic for training. The same is true for any AI vendor we use.
          </p>
          <p className="mt-3">
            What you put in stays yours. What Solomon learns about you stays in
            your workspace.
          </p>
        </Section>

        <Section title="Who we share data with (the full list)">
          <p>To run Eliv8 OS, we send minimum-necessary data to:</p>
          <ul className="mt-3 space-y-2">
            <li><strong>Supabase</strong> — database, authentication, file storage. Your data lives here.</li>
            <li><strong>Anthropic</strong> — runs Claude (the AI behind Solomon). We send the prompts and context the AI needs to answer your questions. Anthropic does not retain or train on this data.</li>
            <li><strong>Stripe</strong> — billing. We send your email and subscription info. We do NOT see or store your credit card.</li>
            <li><strong>QuickBooks (optional)</strong> — read-only financial sync. Only if you connect it. We never write to your books.</li>
            <li><strong>ElevenLabs (optional)</strong> — turns Solomon&rsquo;s written answer into speech, and only when you press Listen. We send that one answer. Nothing is sent if you never use it.</li>
            <li><strong>Your browser&rsquo;s speech recognition (optional)</strong> — if you dictate instead of typing. On Chrome this means the audio goes to Google to be turned into text; on Safari it is handled by Apple. Only while the microphone button is on.</li>
          </ul>
          <p className="mt-3">
            That's the full list. No analytics tracking sold to third parties. No
            ad pixels. No data brokers.
          </p>
        </Section>

        <Section title="Account access">
          <p>
            Passwords are hashed with bcrypt — we can't see your password, even if
            we wanted to. Password reset flows go through email verification.
            Multi-factor authentication is on the roadmap.
          </p>
        </Section>

        <Section title="What we're still building">
          <p>Honest list of what's not done yet:</p>
          <ul className="mt-3 space-y-2">
            <li>Self-serve data export (today: email us and we'll send it)</li>
            <li>Multi-factor authentication (planned: 2026)</li>
            <li>SOC 2 Type II audit (planned once we cross 100 customers)</li>
            <li>Single sign-on for agency / multi-team accounts (planned)</li>
            <li>Data residency options (Canada-only / US-only) — currently North-America-wide via Supabase</li>
          </ul>
        </Section>

        <Section title="If something goes wrong">
          <p>
            If we discover a security issue affecting your data, we will email you
            within 72 hours of confirmation, describe what happened, what we're
            doing about it, and what you should do. No PR-spin, no "out of an
            abundance of caution" — just the facts.
          </p>
          <p className="mt-3">
            If you find a vulnerability, please email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            with details and steps to reproduce. We'll respond within 48 hours.
          </p>
        </Section>

        <Section title="Your rights">
          {/* ⚠️ This claimed "you can export every piece of data ... at any
              time, from /settings". There is no export in the product — the
              Settings tabs are Business, Billing, Team, Integrations and Danger
              zone. /help already told the truth ("not self-serve yet — email
              me"), so the honest version was published on the support page and
              the overstated one on the page a cautious buyer reads before
              trusting us. That is the wrong way round for a product whose
              entire pitch is that it does not overstate. */}
          <p>
            Ask us for an export any time — email {CONTACT_EMAIL} and we'll send
            your data over. It isn't self-serve yet; built-in export is on the
            list below. You can delete your workspace yourself from Settings →
            Danger zone, which removes it and all its data within 30 days (the
            30 day window is for backup rotation — after that it's gone).
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>
          </p>
          <Link to="/privacy" className="text-sm text-brand-600 hover:underline">
            Read the privacy policy →
          </Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 leading-relaxed [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1">
        {children}
      </div>
    </section>
  )
}
