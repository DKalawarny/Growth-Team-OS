/**
 * GBPAudit — Local SEO audit renderer.
 *
 * Design principle: every problem is shown with its fix right beside it.
 * Where Claude has generated ready-to-use copy (descriptions, review template,
 * title tag, meta desc), a copy button appears inline so the owner can act
 * without leaving the page.
 *
 * Tabs:
 *   Action Plan   — scores + problem/fix cards + all generated copy
 *   Content       — post ideas, photo list, categories, keywords
 *   Website       — on-page fixes, service pages, schema (each as problem+fix)
 *   Citations & Links — directories, backlinks (each as problem+fix)
 */

import { useState } from 'react'
import PushToBoardButton from './PushToBoardButton'
import ToolDisclaimer from './ToolDisclaimer'

// ── Constants ─────────────────────────────────────────────────────────────────

const POST_STYLES = {
  update:         { dot: 'bg-sky-400',     label: 'Update'  },
  offer:          { dot: 'bg-emerald-400', label: 'Offer'   },
  event:          { dot: 'bg-teal-400',    label: 'Event'   },
  product:        { dot: 'bg-amber-400',   label: 'Product' },
  customer_story: { dot: 'bg-rose-400',    label: 'Story'   },
}
const postStyle = cat => POST_STYLES[cat] ?? POST_STYLES.update

const SCORE_LABELS = {
  completeness: 'Completeness', reviews: 'Reviews', content: 'Content',
  local_signals: 'Local signals', engagement: 'Engagement',
}

const TABS = [
  { id: 'plan',    label: 'Action Plan' },
  { id: 'content', label: 'Content' },
  { id: 'website', label: 'Website' },
  { id: 'links',   label: 'Citations & Links' },
  { id: 'ai',      label: '✦ AI Search' },
]

// ── Root ──────────────────────────────────────────────────────────────────────

export default function GBPAudit({ data }) {
  const [tab, setTab] = useState('plan')
  if (!data) return null

  const {
    audit_grade, summary,
    category_scores   = [],
    quick_wins        = [],
    structural_moves  = [],
    description_rewrite,
    post_ideas        = [],
    photo_shot_list   = [],
    review_strategy,
    categories,
    keywords          = [],
    website_seo,
    citations,
    backlinks,
    schema_markup,
    ai_visibility,
    ask_for_next_time = [],
    books             = [],
  } = data

  return (
    <div>
      {/* Grade strip */}
      <GradeStrip grade={audit_grade} summary={summary} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 mt-5 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'text-brand-700 border-b-2 border-brand-500 -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <ActionPlanTab
          scores={category_scores}
          wins={quick_wins}
          moves={structural_moves}
          descriptionRewrite={description_rewrite}
          reviewStrategy={review_strategy}
          websiteSeo={website_seo}
          nextTime={ask_for_next_time}
          books={books}
        />
      )}
      {tab === 'content' && (
        <ContentTab posts={post_ideas} photos={photo_shot_list} categories={categories} keywords={keywords} />
      )}
      {tab === 'website' && (
        <WebsiteTab seo={website_seo} schema={schema_markup} />
      )}
      {tab === 'links' && (
        <LinksTab citations={citations} backlinks={backlinks} />
      )}
      {tab === 'ai' && (
        <AISearchTab ai={ai_visibility} />
      )}

      <ToolDisclaimer toolId="gbp-optimizer" />
    </div>
  )
}

// ── Grade strip ───────────────────────────────────────────────────────────────

function GradeStrip({ grade, summary }) {
  const letter = (grade || '').trim().charAt(0).toUpperCase()
  const bg =
    letter === 'A' ? 'bg-green-500' :
    letter === 'B' ? 'bg-brand-500' :
    letter === 'C' ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-4">
      <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${bg} flex flex-col items-center justify-center shadow-sm`}>
        <span className="text-xl font-bold text-white leading-none">{grade || '—'}</span>
        <span className="text-[9px] text-white/70 uppercase tracking-wider mt-0.5">grade</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-gray-900 leading-snug">{summary || 'Your local SEO audit'}</p>
        <p className="text-xs text-gray-400 mt-0.5">Work through each tab to fix every issue.</p>
      </div>
    </div>
  )
}

// ── Tab: Action Plan ──────────────────────────────────────────────────────────

function ActionPlanTab({ scores, wins, moves, descriptionRewrite, reviewStrategy, websiteSeo, nextTime, books }) {
  return (
    <div className="space-y-7">

      {/* Score bars */}
      {scores.length > 0 && (
        <Panel title="How you score" hint="The five signals Google weighs for local rankings.">
          <div className="space-y-3">
            {scores.map((c, i) => <ScoreBar key={i} score={c} />)}
          </div>
        </Panel>
      )}

      {/* Quick wins — problem + fix inline */}
      {wins.length > 0 && (
        <Panel title="Quick wins" hint="Do these in the next 2 hours.">
          <div className="space-y-3">
            {wins.map((w, i) => <ProblemFixCard key={i} index={i + 1} item={w} accent="brand" />)}
          </div>
        </Panel>
      )}

      {/* This week — same format */}
      {moves.length > 0 && (
        <Panel title="This week" hint="Bigger moves that compound — don't skip for another quick win.">
          <div className="space-y-3">
            {moves.map((m, i) => <ProblemFixCard key={i} index={i + 1} item={m} accent="gray" />)}
          </div>
        </Panel>
      )}

      {/* Generated copy — ready to use */}
      {(descriptionRewrite || reviewStrategy?.ask_template || websiteSeo?.title_tag) && (
        <Panel
          title="Generated for you"
          hint="These are ready to copy and paste — no editing needed unless you want to tweak them."
        >
          <div className="space-y-3">

                  {descriptionRewrite?.concise && (
              <GeneratedBlock
                label="GBP description — concise"
                text={descriptionRewrite.concise}
                limit={750}
                limitNote="GBP limit"
                where="business.google.com → Edit profile → Description"
              />
            )}

            {descriptionRewrite?.keyword_forward && (
              <GeneratedBlock
                label="GBP description — keyword-forward"
                text={descriptionRewrite.keyword_forward}
                limit={750}
                limitNote="GBP limit"
                where="business.google.com → Edit profile → Description"
              />
            )}

            {reviewStrategy?.ask_template && (
              <GeneratedBlock
                label="Review ask template"
                text={reviewStrategy.ask_template}
                limit={300}
                limitNote="SMS limit"
                sublabel="Personalise [Customer's name] and add your review link"
                mono
              />
            )}

            {websiteSeo?.title_tag && (
              <GeneratedBlock
                label="Website title tag"
                text={websiteSeo.title_tag}
                limit={60}
                limitNote="Google shows 60 chars"
                where="Your CMS → Homepage → SEO title"
                mono
              />
            )}

            {websiteSeo?.meta_description && (
              <GeneratedBlock
                label="Website meta description"
                text={websiteSeo.meta_description}
                limit={160}
                limitMin={145}
                limitNote="145–160 chars ideal"
                where="Your CMS → Homepage → Meta description"
              />
            )}
          </div>
        </Panel>
      )}

      {/* Footer — next time + books */}
      {(nextTime.length > 0 || books.length > 0) && (
        <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100">
          {nextTime.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">For next time</p>
              <ul className="space-y-1">
                {nextTime.map((a, i) => (
                  <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                    <span className="text-gray-300 flex-shrink-0">?</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {books.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Go deeper</p>
              <div className="flex flex-wrap gap-1.5">
                {books.map((b, i) => (
                  <span key={i} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                    📖 {b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Content ──────────────────────────────────────────────────────────────

function ContentTab({ posts, photos, categories, keywords }) {
  return (
    <div className="space-y-7">

      {(categories || keywords.length > 0) && (
        <Panel title="Categories & keywords">
          <div className="space-y-4">
            {categories && <CategoriesBlock cats={categories} />}
            {keywords.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Target keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((k, i) => (
                    <span key={i} className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                      🔍 {k}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Work these naturally into your description, services, and posts.</p>
              </div>
            )}
          </div>
        </Panel>
      )}

      {posts.length > 0 && (
        <Panel title="Post ideas" hint="One post per week minimum — these are your next 8 weeks.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {posts.map((p, i) => <PostCard key={i} post={p} index={i + 1} />)}
          </div>
        </Panel>
      )}

      {photos.length > 0 && (
        <Panel title="Photo shot list" hint="Real job-site photos beat stock every time. All these are takeable this week.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {photos.map((s, i) => <PhotoCard key={i} shot={s} index={i + 1} />)}
          </div>
        </Panel>
      )}

      {/* Review strategy — channels + cadence + anti-patterns (template is on Action Plan) */}
    </div>
  )
}

// ── Tab: Website ──────────────────────────────────────────────────────────────

function WebsiteTab({ seo, schema }) {
  if (!seo && !schema) return <EmptyTab message="No website data in this audit." />
  return (
    <div className="space-y-7">

      {seo?.headline && (
        <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">{seo.headline}</p>
      )}

      {seo?.service_pages?.length > 0 && (
        <Panel title="Service pages" hint="These pages drive organic traffic. Missing ones are leaving jobs on the table.">
          <div className="space-y-2">
            {seo.service_pages.map((p, i) => {
              const isGood    = p.action === 'good'
              const isImprove = p.action === 'improve'
              const dot    = isGood ? 'bg-green-400' : isImprove ? 'bg-amber-400' : 'bg-red-400'
              const badge  = isGood
                ? 'text-green-700 bg-green-50 border-green-200'
                : isImprove
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-red-700 bg-red-50 border-red-200'
              const label  = isGood ? '✓ Good' : isImprove ? 'Improve' : 'Create'
              return (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-sm font-semibold text-gray-900 flex-1">{p.service}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge}`}>{label}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 pl-5">{p.url_slug}</p>
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {seo?.on_page_fixes?.length > 0 && (
        <Panel title="On-page fixes">
          <div className="space-y-3">
            {seo.on_page_fixes.map((f, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
                  <span className="flex-shrink-0 text-xs font-bold uppercase tracking-widest text-amber-500 mt-0.5">Problem</span>
                  <p className="text-sm text-gray-800 flex-1">{f.fix}</p>
                  {f.effort && (
                    <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {f.effort}
                    </span>
                  )}
                </div>
                {f.where && (
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Where to fix</span>
                    <NavPath path={f.where} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {schema && (
        <Panel title="Schema markup" hint={schema.headline}>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schema.recommended_types?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Types to add</p>
                  <div className="flex flex-wrap gap-1.5">
                    {schema.recommended_types.map((t, i) => (
                      <span key={i} className="text-xs font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {schema.required_fields?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Required fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {schema.required_fields.map((f, i) => (
                      <span key={i} className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {schema.implementation && (
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">How to implement</p>
                <p className="text-sm text-gray-700">{schema.implementation}</p>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

// ── Tab: Citations & Links ────────────────────────────────────────────────────

function LinksTab({ citations, backlinks }) {
  if (!citations && !backlinks) return <EmptyTab message="No citations or backlinks data in this audit." />
  return (
    <div className="space-y-7">

      {citations && (
        <>
          {citations.headline && (
            <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">{citations.headline}</p>
          )}

          {citations.nap_rule && (
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-base flex-shrink-0">📌</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">NAP rule</p>
                <p className="text-sm text-gray-700">{citations.nap_rule}</p>
              </div>
            </div>
          )}

          {citations.must_have?.length > 0 && (
            <Panel title="Must-have listings" hint="These directories are direct ranking signals. Claim or verify each one.">
              <div className="space-y-3">
                {citations.must_have.map((d, i) => {
                  const isVerify = d.action === 'verify'
                  const isUpdate = d.action === 'update'
                  const badge = isVerify
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : isUpdate
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                  return (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900">{d.directory}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${badge}`}>
                              {d.action}
                            </span>
                          </div>
                          {d.why && <p className="text-xs text-gray-500">{d.why}</p>}
                        </div>
                      </div>
                      {d.url && (
                        <div className="px-4 py-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Go there</span>
                          <a
                            href={d.url.startsWith('http') ? d.url : `https://${d.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
                          >
                            ↗ {d.url}
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {citations.industry_specific?.length > 0 && (
            <Panel title="Industry directories">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {citations.industry_specific.map((d, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{d.directory}</p>
                    {d.why && <p className="text-xs text-gray-500">{d.why}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      {backlinks && (
        <>
          {backlinks.headline && (
            <p className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3 mt-4">{backlinks.headline}</p>
          )}

          {backlinks.quick_wins?.length > 0 && (
            <Panel title="Backlink quick wins" hint="Links you can secure this month.">
              <div className="space-y-3">
                {backlinks.quick_wins.map((w, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{w.source}</p>
                        {w.action && <p className="text-xs text-gray-500 mt-0.5">{w.action}</p>}
                      </div>
                      {w.effort && (
                        <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {w.effort}
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Fix</span>
                      <span className="text-xs text-gray-500 ml-2">{w.action || 'See above'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {backlinks.outreach_plays?.length > 0 && (
            <Panel title="Outreach plays" hint="1–4 week plays for stronger long-term rankings.">
              <div className="space-y-2">
                {backlinks.outreach_plays.map((p, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{p.target}</p>
                    {p.approach && <p className="text-xs text-gray-600 mb-0.5">{p.approach}</p>}
                    {p.why && <p className="text-xs text-gray-400 italic">{p.why}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {backlinks.content_for_links?.length > 0 && (
            <Panel title="Content that earns links">
              <div className="space-y-2">
                {backlinks.content_for_links.map((c, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm flex-shrink-0">✍️</span>
                      <p className="text-sm font-semibold text-gray-900 flex-1">{c.idea}</p>
                    </div>
                    {c.target_keyword && (
                      <p className="text-xs font-mono text-gray-400 ml-6">🔍 {c.target_keyword}</p>
                    )}
                    {c.why_it_earns_links && (
                      <p className="text-xs text-gray-400 italic ml-6 mt-0.5">{c.why_it_earns_links}</p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}

// ── Problem + Fix card ────────────────────────────────────────────────────────

function ProblemFixCard({ index, item, accent }) {
  const numBg = accent === 'brand' ? 'bg-brand-600' : 'bg-gray-400'
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span className={`flex-shrink-0 w-5 h-5 rounded-full ${numBg} text-white text-[10px] font-bold flex items-center justify-center`}>
          {index}
        </span>
        <p className="text-sm font-semibold text-gray-900 flex-1 leading-snug">{item?.action}</p>
        {item?.time_estimate && (
          <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            ⏱ {item.time_estimate}
          </span>
        )}
        {item?.timeline && (
          <span className="flex-shrink-0 text-[10px] text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            🗓 {item.timeline}
          </span>
        )}
        {item?.action && <PushToBoardButton title={item.action} />}
      </div>

      {/* Problem */}
      {item?.why && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50/60 border-t border-amber-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-0.5 flex-shrink-0 w-14">Problem</span>
          <p className="text-xs text-gray-700 leading-relaxed">{item.why}</p>
        </div>
      )}

      {/* Fix / where to go */}
      {item?.where && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex-shrink-0 w-14">Fix</span>
          <NavPath path={item.where} />
        </div>
      )}

      {/* Owner (structural moves) */}
      {item?.owner && (
        <div className="px-4 pb-2.5 flex items-center gap-2 border-t border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex-shrink-0 w-14">Owner</span>
          <span className="text-xs text-gray-500">{item.owner}</span>
        </div>
      )}
    </div>
  )
}

// ── Generated copy block (with copy button + char counter) ───────────────────

function GeneratedBlock({ label, sublabel, text, where, mono, limit, limitMin, limitNote }) {
  const len     = (text ?? '').length
  const overMax = limit     && len > limit
  const underMin= limitMin  && len < limitMin
  const nearMax = limit     && !overMax && len > limit * 0.9

  // Colour state
  const countColor = overMax  ? 'text-red-600'
                   : underMin ? 'text-amber-500'
                   : nearMax  ? 'text-amber-500'
                   : 'text-green-600'

  const barColor   = overMax  ? 'bg-red-400'
                   : underMin ? 'bg-amber-400'
                   : nearMax  ? 'bg-amber-400'
                   : 'bg-green-400'

  const barWidth   = limit ? Math.min(100, Math.round((len / limit) * 100)) : 0

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${overMax ? 'border-red-200' : 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700">{label}</p>
          {sublabel && <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
        <CopyButton text={text} />
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className={`text-sm text-gray-800 leading-relaxed whitespace-pre-line ${mono ? 'font-mono text-xs' : ''}`}>
          {text}
        </p>
      </div>

      {/* Character count bar */}
      {limit && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold tabular-nums ${countColor}`}>
              {len} / {limit} chars
              {overMax  && ' — over limit, shorten before pasting'}
              {underMin && ` — under ${limitMin} chars, try to expand`}
              {!overMax && !underMin && limitNote && ` — ${limitNote}`}
            </span>
          </div>
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Where to paste */}
      {where && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50/60">
          <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 flex-shrink-0">Where to paste</span>
          <NavPath path={where} />
        </div>
      )}
    </div>
  )
}

// ── Content cards ─────────────────────────────────────────────────────────────

function PostCard({ post, index }) {
  const s = postStyle(post?.category)
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</span>
        <span className="ml-auto text-[10px] text-gray-300 tabular-nums">#{index}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug">{post?.title}</p>
      {post?.angle && <p className="text-xs text-gray-500 mt-0.5">{post.angle}</p>}
    </div>
  )
}

function PhotoCard({ shot, index }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{shot?.title}</p>
          {shot?.why  && <p className="text-xs text-gray-500 mt-0.5">{shot.why}</p>}
          {shot?.where && <p className="text-[11px] text-gray-400 italic mt-0.5">📍 {shot.where}</p>}
        </div>
      </div>
    </div>
  )
}

function CategoriesBlock({ cats }) {
  const { primary, secondary = [], reasoning } = cats ?? {}
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Categories</p>
      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <span className="text-sm font-semibold bg-brand-50 border border-brand-200 text-brand-800 px-3 py-1 rounded-full">
            {primary}
          </span>
        )}
        {secondary.map((s, i) => (
          <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{s}</span>
        ))}
      </div>
      {reasoning && <p className="text-xs text-gray-400 italic mt-2">{reasoning}</p>}
    </div>
  )
}

function ScoreBar({ score }) {
  const raw   = Math.max(0, Math.min(100, Number(score?.score) || 0))
  const label = SCORE_LABELS[score?.category] ?? score?.category ?? 'Category'
  const bar   = raw >= 80 ? 'bg-green-400' : raw >= 60 ? 'bg-brand-400' : raw >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className="text-sm font-semibold text-gray-600 tabular-nums">
          {raw}<span className="text-xs text-gray-400">/100</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${bar} rounded-full`} style={{ width: `${raw}%` }} />
      </div>
      {score?.note && <p className="text-xs text-gray-500 mt-1">{score.note}</p>}
    </div>
  )
}

// ── Tab: AI Search ────────────────────────────────────────────────────────────

function AISearchTab({ ai }) {
  // Graceful fallback for audits generated before this field existed
  if (!ai) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-6 py-8 text-center">
        <p className="text-2xl mb-3">✦</p>
        <p className="text-sm font-semibold text-gray-800 mb-1">Run a fresh audit to unlock AI Search recommendations</p>
        <p className="text-xs text-gray-500">This section wasn't included in your previous audit. Start over to get AI visibility scores and specific actions.</p>
      </div>
    )
  }

  const score = Math.max(0, Math.min(100, Number(ai.readiness_score) || 0))
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 45 ? 'text-amber-600' : 'text-red-600'
  const barColor   = score >= 70 ? 'bg-green-400'  : score >= 45 ? 'bg-amber-400'  : 'bg-red-400'
  const scoreLabel = score >= 70 ? 'Good'           : score >= 45 ? 'Needs work'    : 'Low visibility'

  return (
    <div className="space-y-7">

      {/* What is this */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">What is AI search?</p>
        <p className="text-sm text-amber-900 leading-relaxed">
          More customers are asking ChatGPT, Perplexity, and Google AI <em>"best [trade] in [city]"</em> instead of
          clicking search results. If you're not being recommended, you're invisible to a fast-growing slice of buyers.
          This tab shows your AI search readiness and exactly what to do about it.
        </p>
      </div>

      {/* Score */}
      <Panel title="AI Search Readiness">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-5 mb-4">
            <div className="flex-shrink-0">
              <div className={`text-4xl font-black ${scoreColor} leading-none`}>{score}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">/ 100</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold ${scoreColor} mb-1`}>{scoreLabel}</div>
              {ai.headline && <p className="text-sm text-gray-700 leading-snug">{ai.headline}</p>}
            </div>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
          </div>
          {ai.why_it_matters && (
            <p className="text-xs text-gray-500 mt-3 leading-relaxed border-t border-gray-100 pt-3">{ai.why_it_matters}</p>
          )}
        </div>
      </Panel>

      {/* Top actions */}
      {ai.top_actions?.length > 0 && (
        <Panel
          title="What to do about it"
          hint="Ordered by impact — start at the top. These are the specific moves that get you recommended by AI."
        >
          <div className="space-y-3">
            {ai.top_actions.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{item.action}</p>
                  </div>
                  {item.effort && (
                    <span className="flex-shrink-0 text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {item.effort}
                    </span>
                  )}
                  <PushToBoardButton title={item.action} />
                </div>
                {item.why && (
                  <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50/60 border-t border-amber-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mt-0.5 flex-shrink-0 w-10">Why</span>
                    <p className="text-xs text-gray-700 leading-relaxed">{item.why}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* FAQ content to create */}
      {ai.faq_content?.length > 0 && (
        <Panel
          title="Questions to answer on your website"
          hint="These are the exact phrases customers type into ChatGPT about your trade. Answering them on your website gives AI a reason to cite you."
        >
          <div className="space-y-2">
            {ai.faq_content.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
                  <span className="text-base flex-shrink-0">💬</span>
                  <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">"{faq.question}"</p>
                </div>
                {faq.why_answer_it && (
                  <div className="px-4 py-2.5">
                    <p className="text-xs text-gray-500 leading-relaxed">{faq.why_answer_it}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function Panel({ title, hint, children }) {
  return (
    <div>
      <div className="mb-2.5">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function NavPath({ path }) {
  if (!path) return null
  const steps = path.split(/\s*→\s*/)
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-gray-300 text-[10px] mx-0.5">›</span>}
          <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {step}
          </span>
        </span>
      ))}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
        copied
          ? 'text-green-700 bg-green-50 border-green-200'
          : 'text-gray-500 bg-gray-50 border-gray-200 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function EmptyTab({ message }) {
  return <p className="text-sm text-gray-400 text-center py-10">{message}</p>
}
