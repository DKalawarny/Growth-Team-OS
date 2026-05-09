import { supabase } from './supabase'
import { callClaude, HAIKU } from './anthropic'

/**
 * Library Intelligence — synthesises ALL uploaded knowledge files into a single
 * business intelligence picture, then surfaces:
 *   - A paragraph summary of what the business looks like
 *   - Key strengths, gaps, and opportunities
 *   - 2-4 roadmap milestones that address the gaps/opportunities found
 *
 * Stored as a special document row with tool_id = ANALYSIS_TOOL_ID so no DB
 * migration is required. The GeneratedTab filters this row out so it doesn't
 * appear in the tool-outputs list.
 *
 * Design principles:
 *   - Reads files TOGETHER, not individually — the value is cross-file insight
 *   - Each suggested milestone cites which document revealed the gap
 *   - Auto-triggers after every successful upload; manual re-run also available
 *   - Fails gracefully: if Claude errors, the old analysis is preserved
 */

export const ANALYSIS_TOOL_ID = '__library_analysis__'

const MAX_FILES          = 12
const MAX_CHARS_PER_FILE = 4_000
const MAX_TOTAL_CHARS    = 32_000

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a full library analysis for `companyId`.
 * Fetches all ready knowledge files, calls Claude, replaces any previous
 * analysis in the documents table.
 *
 * Returns the analysis object, or null if there are no ready files.
 * Throws on Claude / DB errors.
 */
export async function runLibraryAnalysis(companyId) {
  // 1. Pull ready files WITH extracted text (not part of the list query)
  const { data: files, error: filesErr } = await supabase
    .from('knowledge_files')
    .select('id, title, kind, notes, extracted_text')
    .eq('company_id', companyId)
    .eq('status', 'ready')
    .not('extracted_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(MAX_FILES)

  if (filesErr) throw new Error(filesErr.message)
  if (!files || files.length === 0) return null

  // 2. Build context block
  const fileContext = files
    .map(f => {
      const meta = [
        f.kind   && `Category: ${f.kind}`,
        f.notes  && `Notes: ${f.notes}`,
      ].filter(Boolean).join(' · ')
      const text = (f.extracted_text || '').slice(0, MAX_CHARS_PER_FILE)
      return `=== ${f.title}${meta ? ` (${meta})` : ''} ===\n${text}`
    })
    .join('\n\n')
    .slice(0, MAX_TOTAL_CHARS)

  // 3. Call Claude
  const prompt = buildPrompt(files.length, fileContext)
  const raw = await callClaude({
    model: HAIKU,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1500,
    json: true,
  })

  const analysis = safeParseJson(raw)
  if (!analysis?.summary) throw new Error('Could not parse analysis response from Claude.')

  // Attach metadata
  analysis.file_ids    = files.map(f => f.id)
  analysis.file_count  = files.length
  analysis.analyzed_at = new Date().toISOString()

  // 4. Replace old analysis row (delete + insert — no unique constraint needed)
  await supabase
    .from('documents')
    .delete()
    .eq('company_id', companyId)
    .eq('tool_id', ANALYSIS_TOOL_ID)

  const { error: insertErr } = await supabase
    .from('documents')
    .insert({
      company_id:  companyId,
      tool_id:     ANALYSIS_TOOL_ID,
      title:       'Library Analysis',
      output_data: analysis,
    })

  if (insertErr) throw new Error(`Could not save analysis: ${insertErr.message}`)

  return analysis
}

/**
 * Fetch the most recent library analysis for `companyId`.
 * Returns the analysis object, or null if none exists.
 */
export async function getLibraryAnalysis(companyId) {
  const { data, error } = await supabase
    .from('documents')
    .select('output_data, created_at')
    .eq('company_id', companyId)
    .eq('tool_id', ANALYSIS_TOOL_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.output_data ?? null
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(fileCount, fileContext) {
  return `You are analyzing the business knowledge library for a home-services business owner.

${fileCount} document${fileCount !== 1 ? 's have' : ' has'} been uploaded:

${fileContext}

Analyze ALL documents TOGETHER as a complete picture of this business — look for patterns across files, not just individual facts.

Return ONLY valid JSON, no explanation or markdown:
{
  "summary": "2-3 sentences describing what this business looks like based on the documents. Be specific about what you actually read.",
  "strengths": [
    "specific strength visible across the documents",
    "specific strength",
    "specific strength"
  ],
  "gaps": [
    "specific gap or risk revealed by the documents",
    "specific gap or risk",
    "specific gap or risk"
  ],
  "opportunities": [
    "specific growth opportunity the documents suggest",
    "specific opportunity",
    "specific opportunity"
  ],
  "suggested_milestones": [
    {
      "title": "Action-oriented milestone title",
      "description": "2 sentences: what this is and why it matters for this business.",
      "timeframe": "0-3 months",
      "category": "foundation",
      "actions": ["concrete step 1", "concrete step 2", "concrete step 3"],
      "weight": 7,
      "reasoning": "The [specific document] shows [specific finding] — this milestone closes that gap."
    }
  ]
}

Rules:
- Strengths / gaps / opportunities: exactly 3 each, specific to what you read (not generic advice)
- suggested_milestones: 2 to 4, only for real gaps revealed by the documents
- category must be one of: foundation, systems, team, revenue, exit
- timeframe must be one of: 0-3 months, 3-6 months, 6-12 months, 12-18 months, 18-24 months
- weight is 1–10 (impact relative to the overall plan)
- reasoning must name a specific document and finding`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseJson(raw) {
  if (!raw) return null
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  try { return JSON.parse(trimmed) }
  catch {
    const s = trimmed.indexOf('{')
    const e = trimmed.lastIndexOf('}')
    if (s === -1 || e === -1) return null
    try { return JSON.parse(trimmed.slice(s, e + 1)) }
    catch { return null }
  }
}
