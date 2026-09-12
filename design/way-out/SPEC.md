# The way out — build spec

Working name: **the way out** (placeholder). A "get unstuck" life-plan product that lives as a separately-named front door on eliv8os, using the same Solomon advisor and the same user account. Not a standalone app.

Give this file and `design-reference.html` to Claude Code. Adapt to the existing eliv8os stack (framework, auth, DB, Solomon prompt pipeline). Don't introduce a second auth or a second AI layer.

---

## 1. What it does

1. Free 3-minute diagnostic → "the path that fits you, and why the other two don't."
2. Paid ($39 one-time) full intake (6 screens, ~15 min) → **the map**: what you have, what to cut, three moves in order, gates, what was crossed off and why.
3. Later (not v1): $9/mo check-in that updates the map as life changes.

Core rules the whole product is built on:
- **Constraints before dreams.** Immovables are asked first so the plan is one they can actually follow.
- **Inventory what they already own**, including things not on any list.
- **Subtract first.** The cut list with the 5–10 year test is the fastest money most people have.
- **Three moves, in order, with gates.** Never a list of 40 ideas. Always say what was cut and why.
- **Location and season shape every move.** No December hole.
- **Honest, not motivational.** If the truth is "the first step is boring and takes three years," say it.
- **Options, not directives.** Frame outputs as a map with trade-offs; never "sell your house." Add a plain-language not-financial-advice line in the map footer.

---

## 2. Screens

### S0 — Opening
- Headline: "You're not stuck. You're missing the order of the steps." (highlight on "the order")
- Lead: "Six honest questions. Then a plan built from what you already have, written like a friend would."
- One free-text: **"In one sentence, what does 'out' look like for you?"** placeholder: "Not clocking in for someone else. Fridays with my kids."
- Button: "Let's figure it out"
- Fine print: "About 15 minutes. Nothing to buy until you've seen your plan." + one handwritten line: "Not another course. Promise."

### S1–S6 — Intake (one screen each)
Every screen: `brand` top-left, `n of 6` top-right, optional **reflection card** at top (see §4), the question in large type, inputs, Back + Next. Validate required fields inline ("Add at least one" / "A sentence is enough").

**S1 — The immovables**
- Multi-select chips: Kids at home · Shared custody · Aging parent nearby · Partner's job is here · Health needs care nearby · Lease / mortgage · Separation or legal agreement · Business partners · Faith community I won't leave · **+ Add your own**
- Free text: "Which of these is truly fixed, and which have you just never questioned?"

**S2 — The people in it with you**
- Single-select: Single · Partnered, on the same page · Partnered, they're nervous · Partnered, they're against it
- Kids' ages (chips: 0–4, 5–11, 12–17, adult, none)
- Free text: "Who in your life will fight this plan, and does that matter?"

**S3 — What you already own that could earn**
- Multi-select chips: Truck · Trailer · Pressure washer · Mower · Tools · Spare room · Garage · Home equity · Camera · Boat / jet ski · Land / yard · A business · A licence or ticket · **+ Add your own** (free-text chip creator — this is the jet-ski case; treat custom entries exactly like built-ins)
- Free text: "What do people ask you for help with?"
- Free text: "What have you been paid for, even once?"

**S4 — Money, plainly**
- Numeric: monthly take-home · monthly must-pay (rent/mortgage, debt, kids) · savings on hand
- Multi-select "spending that isn't must-pay": Eating out · Subscriptions · Vehicle beyond need · Gym / hobbies · Nights out · Shopping · **+ Add your own**
- Free text: "For each thing above: does it get you to the goal? Will it matter in 5 years?" (the 5–10 year test)

**S5 — What you'd trade, and where you are**
- Rank (drag): Comfort · Space · Stability · Proximity to family · Status · Savings
- Time horizon single-select: 6 months · 1 year · 3 years · 5+ years
- Location: city/region text + free text "What's the season like here, and what's the economy doing?"
- Free text: "What's the worst version of this you'd still say yes to?"

**S6 — The destination**
- Single-select: More money · More time · Not working for someone else · Freedom to move
- Free text: "Three years out — where, doing what, with whom. What does a Tuesday look like?"
- Free text: "What are you running from, and what are you running toward?"

### S7 — Reveal (the map)
Builds line by line with staggered fade (see design reference; respect `prefers-reduced-motion`):
1. "Name, age. City."
2. Headline goal, one line, key phrase highlighted (e.g. "Out of the warehouse in twelve months.")
3. **Seen card** (sun border): quotes the user's own words back and names what they missed. **Only rendered when Solomon can quote verbatim from S3 free text. Never inferred.**
4. Two stats, counting up: "Freed by cutting" · "Your quit number" (or the gate-2 number for that plan)
5. "Three moves. This order." — three rows, first marked `now` (sun fill). Each: title, detail line with **when** in green, season note if outdoor.
6. "Crossed off, on purpose" — 2–4 struck-through options, each with a why on tap.
7. Button (sun): "Start move one". Tapping a move ticks it (haptic + soft sound). Footer link: "Ask why anything got crossed off."
8. Footer line: "This is a map of options, not financial or legal advice. Check numbers before you act."

---

## 3. Data model

```
IntakeSession { id, userId, status: draft|complete|paid, createdAt, answers: Answers, map?: Map }

Answers {
  out: string                         // S0
  immovables: Tag[]; immovablesNote: string
  relationship: enum; kidsAges: enum[]; peopleNote: string
  assets: Tag[]; askedFor: string; paidFor: string
  takeHome: number; mustPay: number; savings: number
  discretionary: Tag[]; fiveYearTest: string
  tradeRank: string[]; horizon: enum
  location: { text: string; seasonNote: string }
  worstVersion: string
  goalType: enum; tuesday: string; fromToward: string
}

Tag { key: string; label: string; custom: boolean }   // custom=true for "+ Add your own"

Map {
  headline: string; highlight: string
  seen?: { quote: string; insight: string }           // quote must appear verbatim in answers
  stats: [{ label, value, prefix, suffix }, { ... }]
  moves: Move[3]
  cut: { label: string; why: string }[]
  seasonPlan?: { months: string; work: string }[]
  disclaimer: string
}

Move { title: string; when: string; detail: string; season?: string; gate: string; order: 1|2|3 }
```

---

## 4. Solomon prompts

Reuse the eliv8os Solomon system prompt and identity. Add two modes.

**Reflection (between screens, S1→S2, S3→S4, S5→S6 only):**
- Input: the previous screen's answers.
- Output: ≤ 2 sentences. Sentence 1 restates a constraint or asset in the user's own words. Sentence 2 states one consequence for the plan. Example: "Shared custody, kids in town. So this plan stays within driving distance and doesn't ask you to trade your Wednesdays."
- No praise, no exclamation marks, no questions.

**Map generation (after S6):**
- Input: full `Answers` + moves library (§5) + location/season rules.
- Output: `Map` JSON only.
- Hard rules: exactly 3 moves, ordered, each with a gate · first move doable within 7 days · at least one move is a **subtract** if discretionary spend > 0 · every outdoor move carries a paired off-season move for the user's climate · `cut` has 2–4 items with a why · `seen` only if a verbatim quote from `askedFor`/`paidFor` supports it · if goalType = "More time", moves are delegation/cut, not hustle · honest tone: if the horizon is unrealistic, say so in `headline` detail and set gates accordingly.
- Never output: MLM, crypto, courses as a move, "start a business" as a move (name the actual business), or anything that requires the user to move away when immovables say they can't.

---

## 5. Moves library (seed — extend in DB)

Each move: `key, title, needs: Tag[], timeToCash, upfront, effort, familyCost, growsInto, seasons, climateTags`.

Seed by asset:
- **Truck/trailer:** hauling, junk removal, small moves, dump runs → route → hire → sell route
- **Pressure washer:** driveways/siding/decks (Apr–Oct temperate) → recurring commercial → crew
- **Mower/tools:** weekly lawns → snow/gutters/lights (winter) → maintenance contracts
- **Spare room / suite:** long-term tenant · student · furnished mid-term (90+ days, travel nurses) · STR only where legal
- **Garage / yard / land:** storage rental, boat/RV parking, workshop lets
- **Boat / jet ski / camper:** peer rental platforms (seasonal), guided outings
- **Home equity:** HELOC into an income asset · sell and downsize · house-hack — always flagged "talk to an accountant/lender"
- **Skill / ticket:** freelance → productize → hire
- **Camera:** real-estate photos, small-business content
- **Time:** shift stacking, seasonal work (framed as fuel for a real move, never the plan)
- **Subtract:** vehicle downgrade, subscriptions, eating out, gym, shopping — with the 5–10 year test text

Custom assets ("+ Add your own") go to Solomon with the instruction: map to the nearest library move or invent one following the same schema.

---

## 6. Design tokens (from `design-reference.html`)

```
paper #FFFDF8 · tint #F5F1E6 · ink #23301F · soft #6B7561
green #2F7D4F (primary) · sun #FFB43A (single accent: now-marker, seen border, final button)
highlight #FFE566 (mark background, one phrase per screen, never across a line break)
```
- Type: Figtree 400/500/700/800 (Google Fonts). Handwriting: Caveat 700 — **used exactly once in the whole product** (S0 fine print).
- Headlines 40px/1.04 on S0, 28–32px elsewhere, letter-spacing -0.025em, left aligned.
- Buttons: pill, 18px/700, green; the map's final button is sun.
- Chips: 2px border, pill, 15px/600; selected = green border + #E8F3EC fill. Custom chips look identical to built-ins.
- Cards: 16px radius, tint background, no shadow. Seen card: 5px sun left border, #FFF5DC.
- No photos, no dark mode default, no streaks/XP, no gradients beyond the highlight mark.
- Motion: reveal stagger only; tick feedback (scale 1.08 + haptic + soft sound). Respect reduced motion.

---

## 7. Free diagnostic (marketing front door)

Separate route. 6 tap-only questions (goalType, horizon, one immovable, one asset, one money band, location). Output one screen: "The path that fits you" (one of: Side-income ladder · Cut-and-delegate · Asset play · Relocate-or-stay) + why the other two don't fit + CTA "Build my full map — $39". Store the answers; pre-fill the paid intake.

---

## 8. Not in v1
Monthly check-in · progress tracking · sharing · community · streaks · admin dashboard beyond a moves-library editor.

## 9. Acceptance checks
- A user with "shared custody" in S1 never receives a relocation move.
- A user in a cold climate with an outdoor move 1 always sees a winter pairing.
- `seen` never renders without a verbatim quote.
- A custom asset ("jet ski") produces a move as well-formed as a built-in.
- Every map has exactly 3 moves, 2–4 cuts, 2 stats, a disclaimer.
