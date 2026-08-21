import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { runToolCall, SONNET } from '../../lib/anthropic'
import { isCapExceeded } from '../../lib/usage'
import { DECISION_PROMPT } from '../../lib/prompts'
import { buildAdvisorContext } from '../../lib/advisorContext'
import { summarizeContext } from '../../lib/toolContextSummary'
import DecisionView from '../../components/tools/DecisionView'
import CapExceededNotice from '../../components/tools/CapExceededNotice'
import ContextUsedLine from '../../components/tools/ContextUsedLine'

/**
 * Work through a decision — /tools/decision
 *
 * Same shape as the other tools (form → context → Claude → structured JSON →
 * result → save to documents), but the output is deliberately several
 * arguments rather than one answer. See DECISION_PROMPT for why.
 *
 * The form is three fields on purpose. A decision worth this page is one the
 * owner is already carrying around; making them fill in eight boxes before
 * anyone engages with it is the wrong greeting.
 */
export default function Decision() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]   = useState({ decision: '', stakes: '', deadline: '' })
  const [stage, setStage] = useState('form')       // form | loading | result
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)
  const [capError, setCapError] = useState(null)
  const [contextSummary, setContextSummary] = useState(null)
  const [saving, setSaving]   = useState(false)

  const canRun = form.decision.trim().length > 8

  async function handleRun() {
    if (!canRun || !profile?.company_id) return
    setStage('loading'); setError(null); setCapError(null)
    try {
      const context = await buildAdvisorContext(profile.company_id, { query: form.decision })
      setContextSummary(summarizeContext(context))
      const systemPrompt = `${DECISION_PROMPT}\n\nBUSINESS_CONTEXT:\n${JSON.stringify(context, null, 2)}`

      const raw = await runToolCall({
        model:     SONNET,
        companyId: profile.company_id,
        userId:    profile.id,
        toolId:    'decision',
        kind:      'generate',
        systemPrompt,
        messages: [{ role: 'user', content: JSON.stringify({
          decision: form.decision.trim(),
          stakes:   form.stakes.trim()   || null,
          deadline: form.deadline.trim() || null,
        }) }],
        maxTokens: 2600,
        json:      true,
      })

      setResult(JSON.parse(raw))
      setStage('result')
    } catch (err) {
      console.error('[decision] generate failed', err)
      if (isCapExceeded(err)) setCapError(err)
      else setError(err.message || 'Something went wrong working this through.')
      setStage('form')
    }
  }

  async function handleSave() {
    if (!result || saving) return
    setSaving(true)
    const { error: insertErr } = await supabase.from('documents').insert({
      company_id:  profile.company_id,
      created_by:  profile.id,
      tool_id:     'decision',
      title:       result.decision?.slice(0, 120) || 'A decision',
      input_data:  form,
      output_data: result,
    })
    setSaving(false)
    if (insertErr) { setError(insertErr.message); return }
    navigate('/documents?tool=decision')
  }

  if (capError) return <div className="max-w-2xl mx-auto px-6 py-12"><CapExceededNotice error={capError} /></div>

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto w-full max-w-[720px] px-6 py-12 flex flex-col gap-8">

        {stage !== 'result' && (
          <>
            <header className="flex flex-col gap-2.5">
              <h1 className="font-serif text-[34px] leading-[1.15] text-ink-900">
                Something you're weighing.
              </h1>
              <p className="text-[15px] leading-[1.65] text-ink-500">
                Solomon will argue it more than one way, tell you where the arguments
                genuinely disagree, and then say where he lands and what he can't see
                from here.
              </p>
            </header>

            <div className="flex flex-col gap-5">
              <Field label="What are you deciding?" hint="In your own words — a sentence is plenty.">
                <textarea
                  rows={2}
                  value={form.decision}
                  onChange={e => setForm(f => ({ ...f, decision: e.target.value }))}
                  placeholder="Whether to take on a contract that would double payroll for eleven weeks"
                />
              </Field>

              <Field label="What turns on it?" hint="Optional. What gets better or worse either way.">
                <textarea
                  rows={2}
                  value={form.stakes}
                  onChange={e => setForm(f => ({ ...f, stakes: e.target.value }))}
                  placeholder="Best month we'd ever bill, but cash gets tight and the crew is already stretched"
                />
              </Field>

              <Field label="When do you have to decide?" hint="Optional.">
                <input
                  type="text"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  placeholder="Friday"
                />
              </Field>

              {error && <p className="text-[14px] text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun || stage === 'loading'}
                  className="px-6 py-3 rounded-[10px] bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 text-white text-[14.5px] font-semibold transition-colors"
                >
                  {stage === 'loading' ? 'Thinking it through…' : 'Work it through'}
                </button>
                <Link to="/advisor" className="text-[14px] text-ink-400 hover:text-ink-600 transition-colors">
                  or just talk to him
                </Link>
              </div>
            </div>
          </>
        )}

        {stage === 'result' && (
          <>
            <DecisionView result={result} />
            {contextSummary && <ContextUsedLine summary={contextSummary} />}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ink-100">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-[10px] bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[14.5px] font-semibold transition-colors"
              >
                {saving ? 'Saving…' : 'Keep this'}
              </button>
              <button
                type="button"
                onClick={() => { setStage('form'); setResult(null) }}
                className="px-6 py-3 rounded-[10px] border border-ink-200 hover:border-ink-300 text-ink-900 text-[14.5px] font-semibold transition-colors"
              >
                Weigh something else
              </button>
              <Link to="/advisor" className="text-[14px] text-ink-400 hover:text-ink-600 transition-colors">
                Take it further with Solomon →
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-ink-900">{label}</span>
      {hint && <span className="text-[13px] text-ink-400">{hint}</span>}
      {children}
    </label>
  )
}
