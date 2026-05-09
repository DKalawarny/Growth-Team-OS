import { Link } from 'react-router-dom'
import { stageDescription } from '../../lib/stageEngine'

/**
 * Hero — inside the dark ink-900 zone. Tells the story of the business in
 * three beats:
 *
 *   1. Personal greeting           → "Good morning, Daniel"
 *   2. Aspirational framing        → mission line (from primary_goal)
 *   3. Accomplishment stats        → "Built · Building · Growing" counters
 *
 * The counters are the critical piece. Standing alone, a dashboard greeting
 * is cold. Three gold numbers showing what the owner has actually built
 * turns the hero into a trophy shelf — the emotional payoff for every week
 * of work.
 */
export default function Hero({
  firstName,
  companyName,
  stage,
  businessProfile,
  daysBuilding,
  milestonesComplete,
  totalMilestones,
  weightedPct,
}) {
  const goals    = formatGoals(businessProfile?.primary_goal)
  const timeline = businessProfile?.goal_timeline
  const missionLine = buildMissionLine(businessProfile, stage)

  return (
    <header>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {/* Company eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-400 mb-2">
            {companyName ?? 'Your business'}
          </p>

          {/* Greeting */}
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            {greeting()}, {firstName ?? 'there'}.
          </h1>

          {/* Mission line — aspirational, data-driven */}
          {missionLine && (
            <p className="text-ink-300 text-base mt-3 leading-relaxed max-w-2xl">
              {missionLine}
            </p>
          )}
        </div>

        <Link
          to="/settings"
          className="text-xs text-ink-500 hover:text-brand-400 flex-shrink-0 mt-1 transition-colors"
        >
          Edit profile →
        </Link>
      </div>

      {/* Stage + goals strip — context chips */}
      <div className="flex items-center gap-2.5 flex-wrap mb-8">
        <StagePill stage={stage} />
        {goals && (
          <>
            <Dot />
            <span className="text-sm text-ink-400">
              Goal: <span className="text-ink-200 font-medium">{goals}</span>
            </span>
          </>
        )}
        {timeline && (
          <>
            <Dot />
            <span className="text-sm text-ink-400">{timeline}</span>
          </>
        )}
      </div>

      {/* Accomplishment counters — the trophy shelf */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Counter
          label="Built"
          value={milestonesComplete ?? 0}
          unit={milestonesComplete === 1 ? 'milestone' : 'milestones'}
          sub={totalMilestones ? `of ${totalMilestones} on your plan` : null}
        />
        <Counter
          label="Building on"
          value={daysBuilding ?? 0}
          unit={daysBuilding === 1 ? 'day' : 'days'}
          sub="of focused growth"
        />
        <Counter
          label="Growing toward"
          value={`${weightedPct ?? 0}%`}
          unit={null}
          sub="of your 24-month plan"
          accent
        />
      </div>

      {/* Stage description — kept but minimized, so it's there for reference
          without stealing attention from the counters. */}
      {stage && (
        <p className="mt-6 text-xs text-ink-500 leading-relaxed max-w-xl">
          {stageDescription(stage)}
        </p>
      )}
    </header>
  )
}

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------

function Counter({ label, value, unit, sub, accent = false }) {
  return (
    <div className="bg-ink-800/50 backdrop-blur-sm border border-ink-700 rounded-xl px-5 py-4 hover:border-brand-500/40 transition-colors">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500 mb-1.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl md:text-4xl font-bold tracking-tight ${accent ? 'text-brand-400' : 'text-white'}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-ink-400 font-medium">{unit}</span>
        )}
      </div>
      {sub && (
        <p className="text-[11px] text-ink-500 mt-1">{sub}</p>
      )}
    </div>
  )
}

function StagePill({ stage }) {
  if (!stage) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-500/15 text-brand-300 border border-brand-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-400" aria-hidden="true" />
      {stage}
    </span>
  )
}

function Dot() {
  return <span className="text-ink-600" aria-hidden="true">·</span>
}

// ----------------------------------------------------------------------------
// Mission-line synthesizer — one sentence that frames the owner's "why"
// in terms that feel personal. Falls through several data sources so it
// degrades gracefully for brand-new accounts.
// ----------------------------------------------------------------------------

function buildMissionLine(businessProfile, stage) {
  const goals = formatGoals(businessProfile?.primary_goal)
  const timeline = businessProfile?.goal_timeline

  if (goals && timeline) {
    return `You're building to ${goals.toLowerCase()} over the next ${timeline.toLowerCase()} — here's what's happening today.`
  }
  if (goals) {
    return `You're building to ${goals.toLowerCase()} — here's what's happening today.`
  }
  if (stage) {
    return `You're a ${stage.toLowerCase()}-stage operator — here's what's happening today.`
  }
  return "Here's what's happening across your business today."
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatGoals(goal) {
  if (!goal) return null
  if (Array.isArray(goal)) return goal.length ? goal.join(' · ') : null
  return String(goal)
}
