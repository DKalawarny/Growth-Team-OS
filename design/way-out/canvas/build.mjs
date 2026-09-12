import { writeFileSync } from 'node:fs'

const T = {
  paper:'#FFFDF8', tint:'#F5F1E6', ink:'#23301F', soft:'#6B7561',
  green:'#2F7D4F', sun:'#FFB43A', hi:'#FFE566', line:'#DCD6C6',
}
const FONT = "Figtree, ui-sans-serif, system-ui, sans-serif"

const shell = (body, { pad = '56px 28px 30px' } = {}) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Caveat:wght@700&display=swap">
  <style>
    body { margin: 0; font-family: ${FONT}; }
    a { color: ${T.green}; } a:hover { color: #24603c; }
    /* The highlighter stroke, not a filled block — and it must never break
       across a line, which is what the nowrap is for. */
    mark { background: linear-gradient(transparent 38%, ${T.hi} 38% 92%, transparent 92%); padding: 0 2px; white-space: nowrap; }
  </style>
</helmet>
<div style="width: 390px; min-height: 844px; box-sizing: border-box; background: ${T.paper}; color: ${T.ink}; font-family: ${FONT}; padding: ${pad}; display: flex; flex-direction: column;">
${body}
</div>
</x-dc>
</body>
</html>
`

const brand = (right = '') => `  <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: ${T.green};">
    <span style="width: 10px; height: 10px; border-radius: 50%; background: ${T.sun}; display: inline-block; flex: none;"></span>
    the way out
    ${right ? `<span style="margin-left: auto; font-weight: 500; color: ${T.soft};">${right}</span>` : ''}
  </div>`

const q = t => `  <p style="font-size: 28px; line-height: 1.15; font-weight: 800; letter-spacing: -0.02em; margin: 34px 0 0;">${t}</p>`
const hint = t => `  <p style="font-size: 14px; color: ${T.soft}; margin: 12px 0 0; line-height: 1.4;">${t}</p>`
const label = t => `  <p style="font-size: 18px; font-weight: 700; line-height: 1.3; margin: 26px 0 0;">${t}</p>`
const rule = (ph = '') => `  <div style="margin-top: 10px; border-bottom: 3px solid ${T.ink}; padding: 8px 0; font-size: 18px; line-height: 1.45; color: ${ph ? '#A9AE9C' : T.ink}; min-height: 30px;">${ph}</div>`

// ⚠️ gap, not margins — sibling groups laid out with flex survive being
// dragged, deleted and duplicated in the editor; whitespace-spaced ones do not.
const chips = (items, { on = [], dashed = [] } = {}) =>
`  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 0;">
${items.map(t => {
  const isOn = on.includes(t), isDash = dashed.includes(t)
  const style = isOn
    ? `border: 2px solid ${T.green}; background: #E8F3EC; color: ${T.green};`
    : isDash
      ? `border: 2px dashed ${T.line}; background: transparent; color: ${T.soft};`
      : `border: 2px solid ${T.line}; background: #fff; color: ${T.ink};`
  return `    <span style="${style} border-radius: 999px; padding: 10px 16px; font-size: 14.5px; font-weight: 600; min-height: 44px; box-sizing: border-box; display: inline-flex; align-items: center;">${t}</span>`
}).join('\n')}
  </div>`

const group = t => `  <p style="font-size: 12.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${T.soft}; margin: 20px 0 0;">${t}</p>`

const btn = (t, { sun = false, top = 22 } = {}) =>
`  <button style="display: block; width: 100%; margin-top: ${top}px; background: ${sun ? T.sun : T.green}; color: ${sun ? T.ink : '#fff'}; border: 0; border-radius: 999px; padding: 18px; font: inherit; font-family: ${FONT}; font-size: 18px; font-weight: 700; min-height: 44px;">${t}</button>`

const nav = (t = 'Next') =>
`  <div style="display: flex; gap: 12px; align-items: center; margin-top: auto; padding-top: 26px;">
    <span style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid ${T.line}; display: inline-flex; align-items: center; justify-content: center; flex: none;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${T.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
    </span>
    <button style="flex: 1; background: ${T.green}; color: #fff; border: 0; border-radius: 999px; padding: 18px; font: inherit; font-family: ${FONT}; font-size: 18px; font-weight: 700; min-height: 44px;">${t}</button>
  </div>`

const reflect = t => `  <div style="margin: 30px 0 0; padding: 16px 18px; border-radius: 16px; background: ${T.tint}; font-size: 16px; line-height: 1.5;">${t}</div>`

const F = {}

// ── S0 ─────────────────────────────────────────────────────────────────────
F['Main.dc.html'] = shell(`${brand()}
  <h1 style="font-size: 40px; line-height: 1.04; font-weight: 800; letter-spacing: -0.025em; margin: 34px 0 0;">You’re not stuck. You’re missing <mark>the order</mark> of the steps.</h1>
  <p style="font-size: 18px; line-height: 1.45; color: ${T.soft}; margin: 18px 0 0; max-width: 28ch;">Six honest questions. Then a plan built from what you already have, written like a friend would.</p>
  <div style="margin-top: auto;">
${label('In one sentence, what does “out” look like for you?')}
${rule('Not clocking in for someone else. Fridays with my kids.')}
${hint('Rough is fine. Better questions are coming.')}
${btn('Let’s figure it out')}
    <p style="font-size: 13px; color: ${T.soft}; text-align: center; margin: 12px 0 0; line-height: 1.4;">About 15 minutes. Nothing to buy until you’ve seen your plan.<br>
      <span style="font-family: Caveat, cursive; font-weight: 700; font-size: 17px; color: ${T.green};">Not another course. Promise.</span></p>
  </div>`)

// ── S1 ─────────────────────────────────────────────────────────────────────
F['S1.dc.html'] = shell(`${brand('1 of 6')}
${q('What can’t move?')}
${chips(['Kids at home','Shared custody','Aging parent','Partner’s job','Health needs care','Lease / mortgage','A legal agreement','Business partners','A community here','Nothing, really'], { on: ['Shared custody'] })}
${chips(['+ Add your own'], { dashed: ['+ Add your own'] })}
${label('Which of these is truly fixed, and which have you just never questioned?')}
${rule()}
${hint('The plan gets built around these, so it’s worth being honest about which are real.')}
${nav()}`)

// ── S2, with the reflection card in place ──────────────────────────────────
F['S2.dc.html'] = shell(`${brand('2 of 6')}
${reflect('Shared custody, kids in town. <b>So this plan stays within driving distance</b> and doesn’t ask you to trade your Wednesdays.')}
${q('Who’s in it with you?')}
${chips(['Single','Partnered, on the same page','Partnered, they’re nervous','Partnered, they’re against it'], { on: ['Partnered, they’re nervous'] })}
${label('Kids’ ages')}
${chips(['None','0–4','5–11','12–17','Adult'], { on: ['5–11'] })}
${label('Who in your life will fight this plan, and does that matter?')}
${rule()}
${nav()}`)

// ── S3 ─────────────────────────────────────────────────────────────────────
F['S3.dc.html'] = shell(`${brand('3 of 6')}
${q('What have you already got that could earn?')}
${group('Vehicles and gear')}
${chips(['Truck or van','Trailer','A car','Tools','Mower','Pressure washer','Camera','Boat / jet ski'], { on: ['Truck or van','Pressure washer'] })}
${group('Space')}
${chips(['Spare room','Garage','Driveway or parking','Land / yard','Home equity'])}
${group('What you can do')}
${chips(['A ticket or licence','A trade','Books or admin','Good with computers','Design or writing','Teaching or tutoring','Care or medical','Cooking','Another language','A business already'])}
${group('Time and people')}
${chips(['Evenings','Weekends','School hours','Someone who’d sub me work','An employer who’d contract me','A group or following'], { on: ['Weekends'] })}
${chips(['+ Add your own'], { dashed: ['+ Add your own'] })}
${label('What do people ask you for help with?')}
${rule('Fixing stuff. Hauling. My uncle’s fence last summer.')}
${label('What have you been paid for, even once?')}
${rule()}
${hint('This is where most people find something they forgot they had.')}
${nav()}`, { pad: '56px 28px 30px' })

// ── S4 ─────────────────────────────────────────────────────────────────────
const money = (l, v, h) => `${label(l)}
  <div style="margin-top: 10px; border-bottom: 3px solid ${T.ink}; padding: 8px 0; font-size: 18px; display: flex; gap: 6px; color: ${v ? T.ink : '#A9AE9C'};"><span style="color: ${T.soft}; font-weight: 600;">$</span>${v || '0'}</div>${h ? `\n${hint(h)}` : ''}`

F['S4.dc.html'] = shell(`${brand('4 of 6')}
${q('Money, plainly.')}
${money('Monthly take-home', '3,400')}
${money('Monthly must-pay', '2,650', 'Rent or mortgage, debt, kids. The things that happen whether you like it or not.')}
${money('Savings on hand', '')}
${label('Spending that isn’t must-pay')}
${chips(['Eating out','Subscriptions','The vehicle','Gym / hobbies','Nights out','Shopping','None of this — it’s all must-pay'], { on: ['Eating out','Subscriptions'] })}
${label('For each of those: does it get you to the goal? Will it matter in five years?')}
${rule()}
${nav()}`)

// ── S5 ─────────────────────────────────────────────────────────────────────
// ⚠️ Up/down controls, not drag handles — HTML5 drag does not fire on touch,
// so a drag-only ranker is an unanswerable required question on a phone.
const rankRow = (n, t, first, last) => `    <div style="display: flex; align-items: center; gap: 12px; background: ${T.tint}; border-radius: 14px; padding: 14px 16px; font-size: 16px; font-weight: 600;">
      <span style="color: ${T.soft}; width: 18px; font-variant-numeric: tabular-nums;">${n}</span>${t}
      <span style="margin-left: auto; display: flex; gap: 4px;">
        <span style="width: 34px; height: 34px; border-radius: 10px; background: ${T.paper}; display: inline-flex; align-items: center; justify-content: center; opacity: ${first ? '.3' : '1'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${T.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></span>
        <span style="width: 34px; height: 34px; border-radius: 10px; background: ${T.paper}; display: inline-flex; align-items: center; justify-content: center; opacity: ${last ? '.3' : '1'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${T.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
      </span>
    </div>`

F['S5.dc.html'] = shell(`${brand('5 of 6')}
${q('What would you trade, and where are you?')}
${label('Put these in order — what you’d give up first at the top.')}
  <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
${rankRow(1,'Comfort',true,false)}
${rankRow(2,'Status',false,false)}
${rankRow(3,'Space',false,false)}
${rankRow(4,'Savings',false,false)}
${rankRow(5,'Stability',false,false)}
${rankRow(6,'Proximity to family',false,true)}
  </div>
${label('How long are you giving this?')}
${chips(['6 months','1 year','3 years','5+ years'], { on: ['3 years'] })}
${label('Where are you?')}
${rule('City or region')}
${nav()}`)

// ── S6 ─────────────────────────────────────────────────────────────────────
F['S6.dc.html'] = shell(`${brand('6 of 6')}
${reflect('Three years, and you’d give up space before stability. <b>So this builds slowly enough</b> that nothing has to be sold.')}
${q('Where does this end up?')}
${chips(['More money','More time','Not working for someone else','Freedom to move'], { on: ['Not working for someone else'] })}
${label('Three years out — where, doing what, with whom. What does a Tuesday look like?')}
${rule()}
${label('What are you running from, and what are you running toward?')}
${rule()}
${nav('See the plan')}`)

// ── The map ────────────────────────────────────────────────────────────────
const move = (t, when, detail, { now = false, done = false } = {}) => `  <div style="display: flex; gap: 14px; padding: 12px 0; align-items: flex-start;">
    <span style="width: 26px; height: 26px; flex: none; border: 2.5px solid ${now || done ? (done ? T.green : T.sun) : T.ink}; background: ${now ? T.sun : done ? T.green : 'transparent'}; border-radius: 8px; margin-top: 1px; display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: ${now || done ? 1 : 0};"><path d="M3 8.5l3 3 7-7"/></svg>
    </span>
    <span>
      <p style="margin: 0; font-size: 17px; line-height: 1.3; font-weight: 700;">${t}</p>
      <small style="display: block; font-size: 14px; color: ${T.soft}; font-weight: 500; margin-top: 3px; line-height: 1.35;"><b style="color: ${T.green}; font-weight: 700;">${when}</b> ${detail}</small>
    </span>
  </div>`

// ⭐ The gate on the spine between two moves — the sentence that makes this a
// plan rather than three ideas, and the thing that was buried in grey text.
const gate = t => `  <div style="display: flex; align-items: stretch; gap: 14px; font-size: 13.5px; line-height: 1.4; color: ${T.soft};">
    <span style="flex: none; width: 26px; background: linear-gradient(${T.line}, ${T.line}) center / 2px 100% no-repeat;"></span>
    <span style="padding: 4px 0 10px;">Move 2 starts when <b style="color: ${T.ink};">${t}</b></span>
  </div>`

F['Map.dc.html'] = shell(`${brand('your plan')}
  <p style="font-size: 15px; color: ${T.soft}; margin: 30px 0 6px;">Jake, 23. Nanaimo.</p>
  <h2 style="font-size: 32px; line-height: 1.06; font-weight: 800; letter-spacing: -0.025em; margin: 0;">Out of the warehouse in <mark>twelve months</mark>.</h2>
  <div style="margin: 20px 0 0; padding: 20px 20px 20px 22px; border-left: 5px solid ${T.sun}; background: #FFF5DC; border-radius: 0 16px 16px 0; font-size: 17px; line-height: 1.5;">
    <span style="color: ${T.soft};">“no real skills”</span>
    <b style="display: block; margin-top: 8px; font-weight: 700;">You also mentioned rebuilding your uncle’s fence and hauling for three neighbours. That’s a business that hasn’t sent an invoice yet.</b>
  </div>
  <div style="display: flex; gap: 12px; margin: 22px 0 0;">
    <div style="flex: 1; background: ${T.tint}; border-radius: 16px; padding: 14px 16px;">
      <span style="display: block; font-size: 13px; color: ${T.soft};">Freed by cutting</span>
      <b style="display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px;">$590/mo</b>
      <span style="display: block; font-size: 12px; color: ${T.soft}; margin-top: 4px;">the truck payment and the subscriptions</span>
    </div>
    <div style="flex: 1; background: ${T.tint}; border-radius: 16px; padding: 14px 16px;">
      <span style="display: block; font-size: 13px; color: ${T.soft};">Your quit number</span>
      <b style="display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px;">$10,000</b>
      <span style="display: block; font-size: 12px; color: ${T.soft}; margin-top: 4px;">on track for next summer</span>
    </div>
  </div>
  <h3 style="font-size: 17px; font-weight: 700; margin: 26px 0 4px;">Three moves. This order.</h3>
${move('Pressure wash, door to door','This Saturday.','Aim for three jobs. Runs April to October.',{ now: true })}
${gate('three people have paid you')}
${move('Turn customers into weekly lawns','Month 2.','The same doors, on a schedule instead of one at a time.')}
${gate('eight houses are on a weekly round').replace('Move 2','Move 3')}
${move('Hire one guy, then quit','Month 6.','He runs the round. You keep the warehouse job until the maths is boring.')}
  <h3 style="font-size: 17px; font-weight: 700; margin: 26px 0 4px;">Crossed off, on purpose</h3>
  <div style="border-top: 1px solid ${T.line};">
${['Delivery driving|It pays this month and is worth nothing in three years. You said you had five.','A course|You do not have a knowledge problem. You have three neighbours who already paid you and no invoice.','Moving somewhere cheaper|Shared custody. That ends the conversation.'].map((r,i) => {
  const [l,w] = r.split('|')
  return `    <div style="border-bottom: 1px solid ${T.line}; padding: 13px 0; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
      <s style="font-size: 15.5px; font-weight: 600; color: ${T.soft}; text-decoration-color: #B9B29E;">${l}</s>
      <em style="margin-left: auto; font-style: normal; font-size: 13px; color: ${T.green}; font-weight: 700;">${i === 0 ? 'Hide' : 'Why'}</em>
      ${i === 0 ? `<span style="flex-basis: 100%; font-size: 14.5px; line-height: 1.5; color: ${T.soft}; margin-top: 8px;">${w}</span>` : ''}
    </div>`
}).join('\n')}
  </div>
${btn('Start move one', { sun: true, top: 26 })}
  <p style="margin-top: 22px; font-size: 12.5px; line-height: 1.5; color: ${T.soft};">This is a map of options, not financial or legal advice. Check the numbers before you act.</p>`, { pad: '56px 28px 34px' })

// ── Paywall ────────────────────────────────────────────────────────────────
F['Paywall.dc.html'] = shell(`${brand()}
  <div style="margin-top: auto;">
    <h2 style="font-size: 32px; line-height: 1.06; font-weight: 800; letter-spacing: -0.025em; margin: 0;">That’s everything.</h2>
    <p style="font-size: 18px; line-height: 1.45; color: ${T.soft}; margin: 18px 0 0;">Your answers are saved. The plan reads them back and turns them into three moves in the order they actually work, with what got crossed off and why.</p>
${btn('Build my plan — $39', { sun: true, top: 26 })}
    <p style="font-size: 13px; color: ${T.soft}; text-align: center; margin: 12px 0 0; line-height: 1.4;">Once. Not a subscription.</p>
  </div>`)

// ── Diagnostic ─────────────────────────────────────────────────────────────
F['Diagnostic.dc.html'] = shell(`${brand('3 of 6')}
${q('What have you already got?')}
${chips(['A vehicle or tools','A spare room, garage or land','A skill, trade or free evenings','Not much'])}
${hint('Six taps. No account, nothing to buy.')}
  <div style="margin-top: auto;"></div>`)

F['Result.dc.html'] = shell(`${brand()}
  <p style="font-size: 15px; color: ${T.soft}; margin: 30px 0 6px;">The path that fits you</p>
  <h2 style="font-size: 32px; line-height: 1.06; font-weight: 800; letter-spacing: -0.025em; margin: 0;">The side-income ladder</h2>
  <p style="font-size: 18px; line-height: 1.45; color: ${T.soft}; margin: 18px 0 0;">You own something that can earn before you change anything else.</p>
  <p style="font-size: 16px; line-height: 1.5; color: ${T.soft}; margin: 14px 0 0;">The first rung pays inside a week, and each one buys the next. Nothing here asks you to quit, move, or borrow.</p>
  <h3 style="font-size: 17px; font-weight: 700; margin: 26px 0 4px;">Why not the other three</h3>
  <div style="border-top: 1px solid ${T.line};">
${[['Cut and delegate','Worth doing, but on its own it won’t get you out — it buys runway, not a destination.'],['The asset play','You have the asset, but something else pays faster from where you’re standing.'],['Relocate, or decide not to','You named something that keeps you here. A plan that ignores it isn’t a plan.']].map(([n,w]) =>
`    <div style="border-bottom: 1px solid ${T.line}; padding: 13px 0;">
      <s style="font-size: 15.5px; font-weight: 600; color: ${T.soft}; text-decoration-color: #B9B29E;">${n}</s>
      <span style="display: block; font-size: 14.5px; line-height: 1.5; color: ${T.soft}; margin-top: 6px;">${w}</span>
    </div>`).join('\n')}
  </div>
${btn('Answer the six questions', { top: 26 })}
  <p style="font-size: 13px; color: ${T.soft}; text-align: center; margin: 12px 0 0; line-height: 1.4;">This was the three-minute version.</p>`)


// ── THE OPENING SCREEN — three different bets ────────────────────────────────
// The visual system is settled, so these do not vary the look. They vary the
// STRATEGY for the first fifteen seconds a stranger has ever seen this product,
// and each one is wrong in a different way.

const openShell = (body) => shell(`${brand()}
${body}`, { pad: '56px 28px 34px' })

const bigHead = (a, mark, b) => `  <h1 style="font-size: 40px; line-height: 1.04; font-weight: 800; letter-spacing: -0.025em; margin: 34px 0 0;">${a}<mark>${mark}</mark>${b}</h1>`
const lead = t => `  <p style="font-size: 18px; line-height: 1.45; color: ${T.soft}; margin: 18px 0 0; max-width: 28ch;">${t}</p>`
const body = t => `  <p style="font-size: 17px; line-height: 1.5; margin: 20px 0 0;">${t}</p>`
const fineC = t => `  <p style="font-size: 13px; color: ${T.soft}; text-align: center; margin: 12px 0 0;">${t}</p>`

// A — RECOGNITION. Names something true about the reader rather than claiming
// anything about the product. Safest, and the one currently live.
// ⚠️ Weakness: it is still copy asking to be believed. A sceptic has no reason
// to spend three minutes on the word of a page.
F['OpenRecognition.dc.html'] = openShell(`${bigHead('You probably already know ', 'three things', ' you could do.')}
${lead('The hard part is which one is first — and what to ignore.')}
  <div style="margin-top: auto;">
${body('Six questions, about three minutes. At the end it names the path that actually fits you, and why the other three don’t. Whether getting out means earning more or needing less.')}
${btn('Start')}
${fineC('No account. Nothing to buy to see it.')}
  </div>`)

// B — DEMONSTRATION. Shows the shape of the answer before asking for anything.
// The crossed-off list is the thing nothing else does, so this puts the proof on
// screen instead of promising it.
// ⚠️ Weakness: more to read, and it shows the hand early — someone might take
// the idea and leave.
F['OpenDemo.dc.html'] = openShell(`${bigHead('Sometimes the answer is that you ', 'already can', '.')}
${lead('Most advice assumes you need more money. Often you need a different arrangement.')}
  <div style="margin: 26px 0 0; padding: 18px 20px; background: ${T.tint}; border-radius: 16px;">
    <p style="margin: 0 0 12px; font-size: 12.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: ${T.soft};">What an answer looks like</p>
    <p style="margin: 0 0 12px; font-size: 18px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15;">Four days a week, by March.</p>
    <div style="display: flex; gap: 12px; align-items: flex-start;">
      <span style="width: 22px; height: 22px; flex: none; border-radius: 7px; background: ${T.sun}; margin-top: 2px;"></span>
      <span><p style="margin: 0; font-weight: 700; font-size: 16px;">Work out what your life actually costs</p>
      <small style="display: block; font-size: 13.5px; color: ${T.soft}; margin-top: 2px;"><b style="color: ${T.green};">One evening.</b> Most people have never done it.</small></span>
    </div>
    <p style="margin: 14px 0 0; font-size: 13.5px; line-height: 1.6; color: ${T.soft};">
      <s style="text-decoration-color: #B9B29E;">A side business.</s> <s style="text-decoration-color: #B9B29E;">Selling the house.</s> <s style="text-decoration-color: #B9B29E;">Waiting for a promotion.</s><br>
      <span style="color: ${T.ink};">Crossed off, with the reason.</span>
    </p>
  </div>
  <div style="margin-top: auto;">
${btn('Find out which way yours goes')}
${fineC('Six questions, three minutes. Nothing to buy to see it.')}
  </div>`)

// C — THE QUESTION IS THE DOOR. Almost no copy: start being useful immediately
// and let the result do the selling.
// ⚠️ Weakness: a stranger who does not already trust it has been told nothing,
// and "what are you actually after" from an unknown page can read as a quiz
// funnel — which is the register this product cannot afford.
F['OpenQuestion.dc.html'] = openShell(`  <p style="font-size: 15px; color: ${T.soft}; margin: 34px 0 0;">Three minutes. No account.</p>
${bigHead('What are you ', 'actually', ' after?')}
${chips(['More money','More time','Not working for someone else','Freedom to move','Less — a simpler life','To be somewhere else'])}
  <div style="margin-top: auto;">
${fineC('Six questions. At the end it names the path that fits, and why the others don’t.')}
  </div>`)


// ── THE SAME PRODUCT, THE OTHER DIRECTION ────────────────────────────────────
// 🔴 EVERY EXAMPLE IN THIS FILE WAS JAKE — truck, pressure washer, earn more —
// because the design reference and the sample data are all Jake. One example is
// one product. Daniel caught the drift three times before I understood that the
// fix is not wording, it is a second example on the screen.
F['MapSimpler.dc.html'] = shell(`${brand('your plan')}
  <p style="font-size: 15px; color: ${T.soft}; margin: 30px 0 6px;">Marcus, 52. Two kids at home.</p>
  <h2 style="font-size: 32px; line-height: 1.06; font-weight: 800; letter-spacing: -0.025em; margin: 0;">Four days a week by March. <mark>You can already afford it.</mark></h2>
  <div style="margin: 20px 0 0; padding: 20px 20px 20px 22px; border-left: 5px solid ${T.sun}; background: #FFF5DC; border-radius: 0 16px 16px 0; font-size: 17px; line-height: 1.5;">
    <span style="color: ${T.soft};">“I can’t afford to take a day off, that’s the whole problem”</span>
    <b style="display: block; margin-top: 8px; font-weight: 700;">Your must-pay is $4,100 and you bring home $7,900. The day costs $1,580. You have been assuming the answer without doing the arithmetic.</b>
  </div>
  <div style="display: flex; gap: 12px; margin: 22px 0 0;">
    <div style="flex: 1; background: ${T.tint}; border-radius: 16px; padding: 14px 16px;">
      <span style="display: block; font-size: 13px; color: ${T.soft};">What your life costs</span>
      <b style="display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px;">$4,100/mo</b>
      <span style="display: block; font-size: 12px; color: ${T.soft}; margin-top: 4px;">everything that happens anyway</span>
    </div>
    <div style="flex: 1; background: ${T.tint}; border-radius: 16px; padding: 14px 16px;">
      <span style="display: block; font-size: 13px; color: ${T.soft};">The day costs</span>
      <b style="display: block; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px;">$1,580</b>
      <span style="display: block; font-size: 12px; color: ${T.soft}; margin-top: 4px;">a month, before tax changes</span>
    </div>
  </div>
  <h3 style="font-size: 17px; font-weight: 700; margin: 26px 0 4px;">Three moves. This order.</h3>
${move('Work out what your life actually costs','One evening.','Not what you earn. What leaves. Most people have never written it down.',{ now: true })}
${gate('you have the real number, not the one you assume').replace('Move 2','Move 2')}
${move('Show Jen the number before you ask for anything','Next week.','She is not against this. She has never seen it on paper either.')}
${gate('she has seen it and you have both slept on it').replace('Move 2','Move 3')}
${move('Ask for the four-day week','March.','Ask for it as a trial with an end date. Easier to say yes to.')}
  <h3 style="font-size: 17px; font-weight: 700; margin: 26px 0 4px;">Crossed off, on purpose</h3>
  <div style="border-top: 1px solid ${T.line};">
${['A side business|You are short of time, not money. This spends the thing you came here to get back.','Selling the house|The kids have two years of school left and you ranked that above everything except your health.','Waiting for the promotion|It pays 9% and costs the evenings. It moves you further from the Tuesday you described.'].map((r,i) => {
  const [l,w] = r.split('|')
  return `    <div style="border-bottom: 1px solid ${T.line}; padding: 13px 0; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
      <s style="font-size: 15.5px; font-weight: 600; color: ${T.soft}; text-decoration-color: #B9B29E;">${l}</s>
      <em style="margin-left: auto; font-style: normal; font-size: 13px; color: ${T.green}; font-weight: 700;">${i === 0 ? 'Hide' : 'Why'}</em>
      ${i === 0 ? `<span style="flex-basis: 100%; font-size: 14.5px; line-height: 1.5; color: ${T.soft}; margin-top: 8px;">${w}</span>` : ''}
    </div>`
}).join('\n')}
  </div>
${btn('Start move one', { sun: true, top: 26 })}
  <p style="margin-top: 22px; font-size: 12.5px; line-height: 1.5; color: ${T.soft};">This is a map of options, not financial or legal advice. Check the numbers before you act.</p>`, { pad: '56px 28px 34px' })

for (const [name, src] of Object.entries(F)) writeFileSync(name, src)

const W = 390, GAP = 90, ROW = 980
const row1 = ['Main.dc.html','S1.dc.html','S2.dc.html','S3.dc.html','S4.dc.html','S5.dc.html','S6.dc.html']
const row2 = ['Map.dc.html','MapSimpler.dc.html','Paywall.dc.html']
const row3 = ['Diagnostic.dc.html','Result.dc.html']
const row4 = ['OpenRecognition.dc.html','OpenDemo.dc.html','OpenQuestion.dc.html']
const h = f => f === 'S3.dc.html' ? 1500 : f === 'S5.dc.html' ? 1180 : (f === 'Map.dc.html' || f === 'MapSimpler.dc.html') ? 1560 : 844

writeFileSync('canvas.json', JSON.stringify({
  artboards: [
    ...row1.map((f,i) => ({ file: f, x: i*(W+GAP), y: 0, w: W, h: h(f) })),
    ...row2.map((f,i) => ({ file: f, x: i*(W+GAP), y: 1700, w: W, h: h(f) })),
    ...row3.map((f,i) => ({ file: f, x: (i+3)*(W+GAP), y: 1700, w: W, h: h(f) })),
    ...row4.map((f,i) => ({ file: f, x: i*(W+GAP), y: 3400, w: W, h: 844 })),
  ],
  annotations: [
    { id: 'intake', x: 0, y: -150, w: 560, text: 'THE INTAKE — paid, six screens.\nThe order is the product: what is fixed, who is affected, what you have, the money, what you would trade, and only then where you want to end up.' },
    { id: 'deliver', x: 0, y: 1550, w: 900, text: 'THE MAP — the same product, both directions. JAKE closes the gap by earning more. MARCUS closes it by needing less, and his plan crosses OUT starting a business. One example is one product; this is why there are two.' },
    { id: 'front', x: 960, y: 1550, w: 520, text: 'THE FREE DIAGNOSTIC — public, six taps, rules not a model. Naming what does NOT fit is what earns the next click.' },
    { id: 'openers', x: 0, y: 3230, w: 1340, text: 'THE OPENING SCREEN — three bets on the first fifteen seconds, same visual system.\n\nRECOGNITION names something true about the reader — safest, but still asks to be believed.\nDEMONSTRATION shows the shape of an answer before asking for anything — strongest proof, shows the hand early.\nQUESTION starts being useful immediately — best completion, but a stranger has been told nothing, and it can read as a quiz funnel.' },
  ],
  launch: { view: 'canvas' },
}, null, 2))
console.log('wrote', Object.keys(F).length, 'artboards + canvas.json')
