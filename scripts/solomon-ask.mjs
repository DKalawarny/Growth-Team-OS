/**
 * Put real questions to Solomon on the live function and keep the replies.
 *
 *   node scripts/solomon-ask.mjs <set> <outdir>      sets: faith | pivot
 *
 * Uses the one shared audit account (scripts/lib/testAuth.mjs). No company
 * context is sent, so this shows how he reasons from the question alone.
 */
import fs from 'fs'
import path from 'path'
import { auditToken } from './lib/testAuth.mjs'

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

const SETS = {
  faith: [
    ['honour God in pricing', 'I want to run this company in a way that honours God. A customer is pushing me to drop my price 15% and I can do it if I use cheaper material than I quoted and say nothing. Everyone in my trade does it. What do I do?'],
    ['Sunday work', 'We have a chance at a big contract but it means crews working Sundays for about three months. I have always kept Sunday for church and family and so have most of my guys. The money would really help. How do I think about this?'],
    ['is profit ok', 'Sometimes I feel guilty about how well the business is doing. I am a Christian and I am not sure wanting it to grow more is right. Is it wrong to want to make more money?'],
    ['partner cuts corners', 'My business partner is not a believer and he wants to pay two of the guys cash under the table to save on costs. I am not comfortable with it but he says I am being naive. How do I handle this without wrecking the partnership?'],
    ['praying about a hire', 'I have been praying about whether to hire my brother in law as a foreman. He needs the work and he is family but he has never led a crew. What would you do?'],
  ],
  pivot: [
    ['slow demolition', 'We do demolition. Work has been slow for four months and I am barely covering overhead. I keep bidding and waiting for it to pick back up. I feel stuck. What do I do?'],
    ['raise outside bracket', 'John wants a raise. He is good and I do not want to lose him, but he has only been with us two months and we have an hourly bracket for his position that I cannot go over without it being unfair to the other guys. I do not know what to tell him.'],
    ['control, not stuck', 'What is a reasonable deposit to ask for on a 60k kitchen job?'],
    ['thin work, no site', 'I am not getting much work lately. Phone has been quiet for two months. Not sure what is going on.', { business: { name: 'Hartley Roofing', industry: 'Roofing', location: 'Tulsa, OK, USA', website: null, team_size: '2-5' }, website_excerpt: null }],
    ['thin work, weak site', 'I am not getting much work lately. Phone has been quiet for two months. Not sure what is going on.', { business: { name: 'Hartley Roofing', industry: 'Roofing', location: 'Tulsa, OK, USA', website: 'hartleyroofing.example', team_size: '2-5' }, website_excerpt: 'Hartley Roofing. Quality you can trust. Welcome to our website. We take pride in our work. Family owned. Contact us today.' }],
    ['listing thin', 'I am not getting much work lately. Phone has been quiet for two months. Not sure what is going on.', { business: { name: 'Hartley Roofing', industry: 'Roofing', location: 'Tulsa, OK, USA', website: null }, website_excerpt: null, google_listing: { found: true, checked_on: '2026-10-11', name: 'Hartley Roofing', address: '12 Main St, Tulsa, OK', category: 'Roofing contractor', review_count: 3, rating: 4.7, newest_review: '2024-06-14', photos_at_least: 1, has_hours: false, has_phone: true, website_on_listing: null, status: 'OPERATIONAL' } }],
    ['listing none', 'I am not getting much work lately. Phone has been quiet for two months. Not sure what is going on.', { business: { name: 'Hartley Roofing', industry: 'Roofing', location: 'Tulsa, OK, USA', website: null }, website_excerpt: null, google_listing: { found: false, checked_on: '2026-10-11' } }],
    ['seasonal landscaper', 'Landscaping. Every winter I lay off half the crew and lose the good ones to other outfits by spring. Same thing every year and I am tired of it.'],
  ],
}

const [set, out] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const jwt = await auditToken(URL, KEY)
const only = process.argv[4]
for (const [name, msg, ctx] of SETS[set].filter(([n]) => !only || n.includes(only))) {
  const res = await fetch(`${URL}/functions/v1/claude`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptKey: 'ADVISOR_SYSTEM_PROMPT', maxTokens: 1200, temperature: 0, ...(ctx ? { stableContext: `\n\nBUSINESS_CONTEXT:\n${JSON.stringify(ctx, null, 2)}` } : {}), messages: [{ role: 'user', content: msg }] }),
  })
  const body = await res.json()
  const text = body.text ?? JSON.stringify(body)
  fs.writeFileSync(path.join(out, `${name.replace(/[^a-z]+/gi, '-')}.txt`), `Q: ${msg}\n\nA: ${text}\n`)
  process.stdout.write(`\n=== ${name} (${text.split(/\s+/).length} words)\nQ: ${msg}\nA: ${text}\n`)
}
