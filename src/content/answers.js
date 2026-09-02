/**
 * Eliv8 OS Answers — crawlable question pages for AI citation.
 *
 * ⭐ WHY THESE EXIST, and why they are not "content marketing". kinwove's own
 * numbers are the whole argument: of 28 accounts, the ONLY strangers who ever
 * arrived did so via utm_source=chatgpt. Not Google, not backlinks — an
 * assistant answered somebody's question and cited a page. That is the single
 * channel with evidence behind it, and Eliv8 currently has nothing
 * question-shaped for one to cite.
 *
 * ⚠️ AN ANSWER PAGE IS NOT A LANDING PAGE. /for/plumbers answers "what is this
 * product", which nobody types. These answer what people actually type. If a
 * page cannot stand on its own as the best answer on the internet to that
 * question — useful to someone who never buys anything — it does not belong
 * here, because that is exactly what an assistant is choosing between.
 *
 * ⚠️ ON THE FAITH-SHAPED ONES. Daniel removed identity targeting from every
 * surface twice (26 and 29 Aug): "I want this open to everyone." That decision
 * was about not sorting people AT THE DOOR. An answer page is not a door —
 * someone arrives at their own question. Answering "is it wrong to make a big
 * profit" honestly is meeting the question that was asked, not deciding who the
 * reader is. So: most pages carry no identity at all, and the few that do carry
 * it because the QUESTION did.
 *
 * Shape of an entry (follows kinwove's, which is what worked):
 *   answer  — 40–60 words, self-contained. This is the block engines lift.
 *   body    — [{h, p}] the actual substance
 *   faqs    — [{q, a}] becomes FAQPage schema
 *
 * ⚠️ The voice is Solomon's: direct about the situation, never directive about
 * the person; no promises of outcome; says what it cannot know. If a paragraph
 * could sit on any consultancy's blog, rewrite it or cut it.
 */

export const ANSWERS = [
  {
    slug: 'should-i-drop-my-price-to-win-a-job',
    question: 'Should I drop my price to win a job?',
    category: 'Pricing',
    updated: '2026-09-02',
    answer:
      'Do the arithmetic before the decision. Eight points off a 22% margin does not leave you 14% — it depends entirely on how the job is costed, and a discount on top of stale material rates can put you below cost without it showing until invoicing. Look at what the job contains before you look at the price.',
    body: [
      { h: 'A cost taken out is worth more than a discount given away',
        p: 'A discount repeats. It sets what that customer expects on the next quote, and often what your crew hears as the going rate. A cost removed from the job happens once and keeps the price intact — delivery timing, hiring a machine you own an alternative to, a spec the customer would never miss. Look there first.' },
      { h: 'Check the price still clears, and where it stops clearing',
        p: 'Not "is it still profitable" but what it clears, on what assumptions, and at what point it stops. A price that only survives if the job goes perfectly is not a price that survives. If your material rates are months old, you are discounting from a number that was already wrong.' },
      { h: 'What it must never mean',
        p: 'Reaching a number by paying people less, running a crew thinner than the work safely needs, or quietly delivering less than you quoted is not a saving. It is the price coming down anyway with somebody else carrying it. If the number can only be reached that way, the number cannot be reached.' },
      { h: 'The question worth asking yourself',
        p: 'Would you price it there if you had three more of these lined up? If the answer is no, the decision is being made by the gap in your schedule rather than by the job. That does not automatically make it wrong — a slow month is a real fact — but it is worth knowing which one is doing the deciding.' },
    ],
    faqs: [
      { q: 'How much of a discount is too much?', a: 'There is no universal number. It depends on what the job costs you to deliver, which most owners have not calculated for that specific job. Work out the delivered cost first; the answer falls out of it.' },
      { q: 'What if I lose the customer by holding my price?', a: 'Sometimes you will. A customer only available at a price that loses you money is not a customer you kept, and taking the work means less capacity for work that pays.' },
      { q: 'Is it better to discount or to reduce scope?', a: 'Reducing scope, almost always — provided you say so plainly. The same money for less work is honest. The same work for less money teaches the customer what your price really is.' },
    ],
  },
  {
    slug: 'can-i-afford-to-hire-someone',
    question: 'Can I afford to hire someone?',
    category: 'Hiring',
    updated: '2026-09-02',
    answer:
      'The money in your account is a one-time number and a wage is a recurring cost. Cushion covers a salary for a few months; after that only work coming in covers it. So the real question is not whether you can afford the first three months — it is what is expected to hold the cost after that.',
    body: [
      { h: 'Cushion and income are different things',
        p: 'Forty thousand in the bank can pay a wage for five months. It cannot pay one indefinitely. Before the hire, ask what work is expected to carry it once the cushion is gone — booked jobs, a contract renewing, a season you can count on. If the answer is "more work will come", that is a hope, not a plan.' },
      { h: 'Some of that balance is not yours',
        p: 'A bank balance holds the sales tax you collected and the deductions you withheld from payroll. Neither is spendable. An owner who thinks he has forty thousand and actually has twenty-two does not need advice, he needs the subtraction he forgot.' },
      { h: 'What the hire is for changes the answer',
        p: 'Hiring to take work you are turning down is a different decision from hiring to get yourself off the tools, which is different again from covering someone you think is about to leave. Same cost, three different risks. Be specific about which one you are actually solving.' },
      { h: 'The cost is bigger than the wage',
        p: 'Payroll taxes, insurance, tools, a vehicle, and the weeks before they are productive. And your time — a new person costs you hours before they save you any. Budget the real number, not the hourly rate.' },
    ],
    faqs: [
      { q: 'How much work do I need before hiring?', a: 'Enough that the new person is busy after the cushion runs out, not just during it. If you cannot name the specific work, you are hiring on optimism.' },
      { q: 'Should I use a subcontractor instead?', a: 'Often, early on. It converts a fixed cost into a variable one, which is exactly what you want while you are still finding out whether the work is steady.' },
      { q: 'What if I lose work because I am short-handed?', a: 'That is a real cost and worth weighing. But turning down two jobs is survivable. Carrying a wage you cannot fund is how businesses fail while looking busy.' },
    ],
  },
  {
    slug: 'why-is-my-margin-dropping-when-revenue-is-up',
    question: 'Why is my margin dropping when revenue is up?',
    category: 'Money',
    updated: '2026-09-02',
    answer:
      'Growing revenue with falling margin almost always means your prices are lagging your costs. Material rates move faster than quotes get updated, and every job priced from an old rate file quietly loses a little. Volume then multiplies the loss rather than covering it.',
    body: [
      { h: 'Check how old the numbers in your quotes are',
        p: 'If your material rates were last updated months ago, every quote since has been built on prices you no longer pay. It does not show up in any single job — it shows up as a margin that drifts down while everything feels busy.' },
      { h: 'More work makes it worse, not better',
        p: 'This is the part owners find counterintuitive. If each job loses two points, doing more of them loses more. Growth is only a fix when the unit is profitable; otherwise it is an accelerator pointed the wrong way.' },
      { h: 'Find out whether it is pricing or delivery',
        p: 'The two look identical on a P&L and have opposite fixes. Pricing means you quoted too low. Delivery means the job took longer or used more than planned — rework, access problems, waiting on someone else. You cannot tell them apart from the accounts alone; you need to know what actually happened on the jobs.' },
      { h: 'Look at whole jobs, not the month',
        p: 'A monthly margin is an average that hides everything. Two or three specific jobs usually account for most of the drop, and they will have something in common. That is the thing to fix.' },
    ],
    faqs: [
      { q: 'How often should I update my material rates?', a: 'Often enough that a quote never leaves on prices you no longer pay — monthly is a reasonable default when suppliers are moving. The trigger is supplier changes, not the calendar.' },
      { q: 'Is a falling margin always a pricing problem?', a: 'No. It is often delivery — rework, delays, waiting on another trade. The two have opposite fixes, which is why guessing between them is expensive.' },
      { q: 'What margin should I be making?', a: 'It varies by trade, region and what you include in cost, and anyone quoting you a universal number is guessing. The useful comparison is your own trend and your own jobs against each other.' },
    ],
  },
  {
    slug: 'why-do-good-people-keep-leaving',
    question: 'Why do good people keep leaving?',
    category: 'People',
    updated: '2026-09-02',
    answer:
      'People rarely leave a small business over pay alone. The most common reason is not being set up to do the job — no schedule, no prep, turning up not knowing what the work is. A crew reads that as not being taken seriously, and it is the one cause an owner can see if he looks.',
    body: [
      { h: 'Disorganisation reads as disrespect',
        p: 'Arriving to a locked building, a missing part, or no clear scope is not a small annoyance. It is being told, repeatedly, that your time matters less than everyone else\'s. Good tradespeople have options, and this is the reason they use them.' },
      { h: 'Silence in both directions',
        p: 'Nothing said when the job went well, and no straight conversation when it did not. Recognition costs nothing and its absence is felt. So is criticism that never arrives until it arrives all at once.' },
      { h: 'No visible way up',
        p: 'Nobody stays somewhere with no next step. If there is no answer to "what would it take to be a lead here", that silence is the answer they hear.' },
      { h: 'Blame that stops at the person',
        p: 'When someone keeps making the same mistake, the first question is who was supposed to train them. Failures travel upward more often than owners expect — a crew repeating an error is usually a system nobody wrote down. Not always: someone trained, who knows the standard and ignores it, is the person. But the response is still upstream — whether the standard exists in writing, and whether it was applied the same way for everyone.' },
    ],
    faqs: [
      { q: 'Is it about money?', a: 'Less often than owners assume. Pay gets blamed in exit conversations because it is the easiest thing to say and the hardest to argue with.' },
      { q: 'How do I find out the real reason?', a: 'Ask while they still work for you, not on the way out. And notice what the crew writes down about their days — repeated complaints about the same obstacle are the answer before anyone resigns.' },
      { q: 'What is the cheapest thing that helps?', a: 'Making sure people know what the job is before they arrive. It costs an hour of planning and removes the most common reason good people go.' },
    ],
  },
  {
    slug: 'how-do-i-get-out-of-the-day-to-day',
    question: 'How do I get out of the day-to-day?',
    category: 'The owner',
    updated: '2026-09-02',
    answer:
      'The work has to leave your head before it can leave your hands. Most owners are the bottleneck because the jobs only exist as things they know — pricing logic, which customer needs what, how a job is really done. Written down, that work becomes transferable. Until then, delegating just moves the questions back to you.',
    body: [
      { h: 'Write down the jobs that live in your head',
        p: 'The callout everybody does fifty times a year, the way you price, what has to be true before an install is signed off. If it exists only in your memory, nobody can take it from you, and every attempt to hand it over comes back as a phone call.' },
      { h: 'Hand over whole decisions, not tasks',
        p: 'Giving someone tasks keeps you as the person who decides. Giving them a decision — with the standard written down and the limits clear — is what actually removes you. It is also more uncomfortable, which is why most owners do the first and wonder why nothing changed.' },
      { h: 'The honest measure is not how you feel',
        p: 'It is whether things happen when you are not there. Who wrote the last ten daily reports? Who did the crew call last time something went wrong? Those answers are facts, and they tend to disagree with an owner\'s sense of how far he has stepped back.' },
      { h: 'Expect it to be slower and worse first',
        p: 'Someone else doing it at eighty per cent, consistently, without you, is worth more than you doing it perfectly. Owners who cannot tolerate the eighty per cent stay in the business permanently, and usually describe themselves as unable to find good people.' },
    ],
    faqs: [
      { q: 'How long does it take?', a: 'Longer than most owners expect, because the constraint is not the hiring, it is writing down what you know. Anyone promising a timeline has not seen your business.' },
      { q: 'What should I hand over first?', a: 'Whatever you do most often and dread least losing control of. Frequency builds the habit on both sides faster than importance does.' },
      { q: 'Do I need to hire a manager to do this?', a: 'Not necessarily, and hiring one before the work is written down usually fails — you have added a salary and kept the bottleneck.' },
    ],
  },
  {
    slug: 'is-it-wrong-to-make-a-large-profit',
    question: 'Is it wrong to make a large profit?',
    category: 'Conviction',
    updated: '2026-09-02',
    answer:
      'Profit made by doing good work at an honest price is not something to apologise for — it is what lets you pay people properly, survive a bad quarter and keep your word when keeping it costs something. The question worth asking is not how much you made but how you made it, and what it cost the people involved.',
    body: [
      { h: 'How it was made is the actual question',
        p: 'The same profit figure can come from work priced fairly and delivered well, or from underpaying people and cutting corners nobody checks. The number does not distinguish between them. What you did to get it does.' },
      { h: 'Underpricing is not humility',
        p: 'Owners who feel uneasy about profit often solve it by charging too little, and then discover they cannot pay properly, cannot invest, and cannot absorb a bad month. A business that is fragile because its owner was uncomfortable charging fairly serves nobody — least of all the people depending on it for a wage.' },
      { h: 'What profit is for',
        p: 'It is not only extraction. It is the buffer that means you do not have to take a bad job in a slow month, the thing that pays for training, the reason you can keep someone on through a quiet winter. Thin margins remove all of those choices, and the pressure lands on the people with the least say.' },
      { h: 'Where it does go wrong',
        p: 'When the number becomes the only thing measured. When a customer who will never check the invoice gets treated differently. When "we can\'t afford it" is said about wages and not about anything else. Those are worth watching, and none of them is fixed by making less money.' },
    ],
    faqs: [
      { q: 'How much profit is too much?', a: 'There is no line, and anyone who gives you one is substituting their judgement for yours. The examinable things are the price, the wages, and whether the work was worth what was charged.' },
      { q: 'Should I charge less to be fair to customers?', a: 'Fair means the price reflects the value and the cost. Charging below that is not generosity, it is a subsidy you fund by paying people less or working yourself into the ground.' },
      { q: 'Is it wrong to want the business to grow?', a: 'No. It is worth being clear what the growth is for, because "bigger" is not automatically better and a larger business you hate running is not a win.' },
    ],
  },
  {
    slug: 'how-do-i-compete-when-others-cut-corners',
    question: 'How do I compete when competitors cut corners?',
    category: 'Conviction',
    updated: '2026-09-02',
    answer:
      'You cannot win on price against someone who is not paying for what you pay for — proper labour, real materials, insurance, doing it once. So do not compete there. Compete where the corner-cutting eventually shows: on jobs where being wrong is expensive, and with customers who have been burned before.',
    body: [
      { h: 'Understand what you are actually being undercut by',
        p: 'A price that seems impossible usually is. It is cash labour, a thinner spec, no insurance, or a plan to be somewhere else when it fails. You are not losing to a better operator; you are being compared against a different product wearing the same name.' },
      { h: 'Make the difference legible before the price',
        p: 'Customers cannot see what is inside a quote. If yours includes things theirs does not, say so in the quote itself — plainly, without disparaging anyone. Most people are not choosing cheap on purpose; they are choosing the only thing they were shown.' },
      { h: 'Choose the work where it matters',
        p: 'Some customers will always buy on price and will not be persuaded. Others have already paid twice for the same job and will never do it again. The second group is smaller, harder to find, and worth the whole business.' },
      { h: 'Do not let it make you bitter',
        p: 'Owners lose more to resentment about competitors than to the competitors. The ones cutting corners are usually running a thinner, more fragile business than yours and will meet the consequences without your help.' },
    ],
    faqs: [
      { q: 'Should I match a lowball price to keep a customer?', a: 'Not if it means losing money, and rarely otherwise — you have taught them your real price and they will expect it next time.' },
      { q: 'How do I explain why I cost more without sounding negative?', a: 'Describe what is included rather than what theirs lacks. "This includes X, Y and Z" holds up; "they cut corners" sounds like an excuse.' },
      { q: 'Is it worth reporting unlicensed competitors?', a: 'That depends on your jurisdiction and what you can actually evidence. Run it past someone qualified rather than acting on frustration.' },
    ],
  },
  {
    slug: 'how-do-i-know-if-im-underpricing',
    question: 'How do I know if I am underpricing?',
    category: 'Pricing',
    updated: '2026-09-02',
    answer:
      'Two signs, and neither is winning too many jobs. You are busy and the money does not arrive. And you cannot say what a specific finished job actually cost you to deliver — because if you cannot, your price was set against a guess and has probably not moved since.',
    body: [
      { h: 'Busy and broke is the classic signature',
        p: 'Full schedule, good reputation, nothing in the bank. That combination is almost always pricing rather than spending. Work is being sold for less than it costs to do, and volume is hiding it by keeping everyone occupied.' },
      { h: 'Winning nearly everything you quote',
        p: 'A high win rate feels like success and is usually a warning. If almost nobody says no, the price is not being tested. Losing some jobs on price is a sign you are near the edge of what the work is worth.' },
      { h: 'Check one finished job properly',
        p: 'Take a job that is done and paid. What did it actually cost — labour at real loaded rates, materials at what you paid, the drive time, the return visit nobody logged? Compare that with what you invoiced. One job done honestly tells you more than a month of averages.' },
      { h: 'The number that gets forgotten',
        p: 'Your own time. Owners routinely price themselves at nothing and then conclude the job was profitable. If you worked on it, it has a cost, and leaving it out is how a business looks fine for years while its owner earns less than the people he employs.' },
    ],
    faqs: [
      { q: 'What win rate should I expect?', a: 'It varies by trade and how you sell, but winning everything is a signal worth investigating. Some rejection means the price is being tested.' },
      { q: 'Should I raise all my prices at once?', a: 'Usually not. Start with new quotes and the work you least want more of. That tests the market without risking the customers you value.' },
      { q: 'How do I raise prices with existing customers?', a: 'Tell them before it happens, say why in one sentence, and do not over-explain. Most reasonable customers expect increases; what they resent is finding out on an invoice.' },
    ],
  },
]

/** Categories in the order they should appear on the index. */
export const ANSWER_CATEGORIES = ['Pricing', 'Money', 'Hiring', 'People', 'The owner', 'Conviction']

export function answerBySlug(slug) {
  return ANSWERS.find(a => a.slug === slug) ?? null
}
