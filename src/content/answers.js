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
  {
    slug: 'should-i-tithe-from-the-business',
    question: 'Should I tithe from the business or personally?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Most owners give personally from what the business pays them, because that is where the money is actually theirs. Giving from the business itself means giving from money that may still owe tax, wages and suppliers. Neither is more spiritual than the other — but only one of them is unambiguously yours to give.',
    body: [
      { h: 'A bank balance is not profit',
        p: 'The account holds sales tax you collected and deductions withheld from payroll. Neither is yours. Owners who give from the balance rather than from what they have actually earned sometimes end up unable to make a remittance — which is not generosity, it is a debt moved somewhere less visible.' },
      { h: 'Where it is genuinely a business decision',
        p: 'Some owners give through the business deliberately — sponsoring something local, doing work at cost for a cause. That is a real choice with real tax consequences, and it is worth an accountant rather than a rule of thumb, because the treatment differs by structure and jurisdiction.' },
      { h: 'What nobody should tell you',
        p: 'That giving will make the business more profitable. It might not. Generosity framed as an investment with a return is not generosity, and an owner who gives expecting the money back has been sold something. If it is worth doing, it is worth doing when the return never comes.' },
      { h: 'The question underneath',
        p: 'Owners usually ask this when giving has started to feel like pressure rather than freedom. That is worth noticing on its own. A number arrived at from guilt tends not to last, and it is not what anyone was after.' },
    ],
    faqs: [
      { q: 'Is there a right percentage?', a: 'People will give you one confidently. The honest answer is that it is a conviction question rather than an accounting one, and a figure that ruins your ability to pay people is not more faithful for being larger.' },
      { q: 'Should I give if the business is losing money?', a: 'That is between you and your conscience, but be clear-eyed: giving from money you owe suppliers or staff moves the cost onto them. Their claim is real too.' },
      { q: 'Is it wrong to take a tax deduction for giving?', a: 'No. Using a deduction that exists is not a loophole, and declining it does not make the gift worth more to the person receiving it.' },
    ],
  },
  {
    slug: 'is-my-struggling-business-a-sign',
    question: 'Is my business struggling because I have done something wrong?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'No. Faithful people run businesses that fail, and dishonest people run businesses that thrive — which is exactly why nobody should read a P&L as a spiritual report card. A hard quarter is usually a market, a customer, a price or a mistake. Those are findable. Guilt is not a diagnosis.',
    body: [
      { h: 'The idea that trouble means disfavour is cruel and it is also false',
        p: 'It is cruel because it lands hardest on someone already frightened, and false because it is contradicted by every honest business owner who has had a bad year. If it were true, the most upright operator in your trade would be the wealthiest. He is not, and you know it.' },
      { h: 'Look for the ordinary cause first',
        p: 'Margin drifting while revenue grows is usually prices lagging costs. Cash tight while profitable is usually receivables. A quiet quarter is often seasonal and visible in last year\'s numbers. Almost every crisis that feels existential has a boring explanation, and boring explanations have fixes.' },
      { h: 'What is worth examining',
        p: 'Not whether you have been faithful enough, but whether anything was decided from fear — a price dropped to survive a slow month, a client taken you already knew was trouble, a date promised you could not hold. Those are worth looking at, and they are decisions, not verdicts.' },
      { h: 'Say it out loud to someone',
        p: 'Owners carry this alone longer than they should, and it gets heavier in private. Someone who knows the numbers and is not depending on you for a wage is worth more than any amount of re-reading the accounts at eleven at night.' },
    ],
    faqs: [
      { q: 'Should I take it as a sign to close?', a: 'Sometimes closing is right. But make that call from the numbers and a clear head, not from a bad month interpreted as a message.' },
      { q: 'Does prayer help a struggling business?', a: 'Many owners would say it steadies them, and steadiness changes decisions. It is not a substitute for a cash-flow plan, and nobody honest will tell you it is.' },
      { q: 'How do I tell the difference between a bad season and a broken business?', a: 'Look at whether the unit is profitable — whether a typical job makes money. A profitable business in a slow season has a cash problem. An unprofitable one has a pricing problem, and more volume makes it worse.' },
    ],
  },
  {
    slug: 'should-i-only-hire-christians',
    question: 'Should I only hire Christians?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Hiring on shared faith rather than on whether someone can do the work tends to produce both a weaker team and a worse witness — and in most jurisdictions it is unlawful discrimination. The more useful question is whether someone who shares none of your convictions would still want to work for you in a year.',
    body: [
      { h: 'The legal position is not a footnote',
        p: 'Employment law in most places prohibits hiring on religion outside narrow religious-organisation exemptions, and a trade business is very unlikely to qualify. This is a question for an employment lawyer in your jurisdiction before it is a question of conscience.' },
      { h: 'Shared belief is not shared character',
        p: 'It is entirely possible to hire someone who agrees with you about everything and turns up late, cuts corners and is unkind to the crew. Character shows in how someone works, and it is testable in ways a statement of belief is not.' },
      { h: 'The better test',
        p: 'Whether someone who does not share your convictions still wants to work here in a year. If they do, something about how the place runs is working. If they do not, no amount of agreement at the interview will have fixed it.' },
      { h: 'What people actually notice',
        p: 'Being paid properly and on time, being told the truth when it costs you something, and not being shouted at. Those are visible to everyone regardless of what they believe, and they say more than anything you could put in a job advert.' },
    ],
    faqs: [
      { q: 'Can I ask about someone\'s faith in an interview?', a: 'In most jurisdictions, no — and doing so creates legal exposure regardless of intent. Check with an employment lawyer where you are.' },
      { q: 'Is it wrong to prefer someone who shares my values?', a: 'Values like honesty and reliability are fair to hire for and can be assessed from how someone has worked. Religious belief is a different thing and is usually a protected characteristic.' },
      { q: 'What if the role involves representing my convictions?', a: 'That is exactly the case where you need proper advice, because the exemptions are narrow and getting it wrong is expensive.' },
    ],
  },
  {
    slug: 'is-it-wrong-to-take-on-debt',
    question: 'Is it wrong for a Christian business owner to take on debt?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Debt is not treated as sin, but it is treated seriously — the borrower ends up serving the lender, and that is a real loss of freedom rather than a metaphor. The question is not whether borrowing is permitted but whether this particular debt can be serviced when the optimistic case does not happen.',
    body: [
      { h: 'What borrowing actually costs',
        p: 'Not just interest. It costs options. An owner with a payment due each month has fewer choices about which work to take, which customer to walk away from, and how long he can survive a quiet season. That is the part people underestimate, and it is the part that changes how you behave.' },
      { h: 'Test it against the bad case, not the good one',
        p: 'Anyone can service a loan in the year they planned for. Run it against the quarter where your biggest customer pays sixty days late and a truck needs replacing. If it only works when things go well, it is not financing, it is hoping.' },
      { h: 'Borrowing for an asset is different from borrowing for a hole',
        p: 'Debt against equipment that earns is a different decision from debt covering a shortfall you have not diagnosed. The second usually returns, larger, because the cause was never found. Fix the leak before financing it.' },
      { h: 'Presumption is the actual risk',
        p: 'Taking on an obligation on the assumption things will work out — and calling that faith — is the failure mode worth naming. Diligence and planning are not the opposite of trust. "It will come" is not a repayment schedule.' },
    ],
    faqs: [
      { q: 'What about a mortgage on a building?', a: 'Generally the most defensible kind: an asset you use, that holds value, with a payment you can test against real rent you already pay.' },
      { q: 'Is it better to grow slowly with no debt?', a: 'Often, and it is underrated. Slower growth you own outright leaves you free to say no, which is worth more than most owners realise until they cannot.' },
      { q: 'Should I borrow to make payroll?', a: 'Treat that as an alarm rather than a plan. It is usually a symptom of pricing or collections, and borrowing without fixing the cause buys weeks and adds a payment.' },
    ],
  },
  {
    slug: 'how-do-i-share-my-faith-at-work',
    question: 'How do I live out my faith at work without pressuring people?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Mostly by how the place runs rather than by what is said. There is a real power imbalance between an owner and someone who needs the job, and anything that feels like a condition of employment stops being a conversation. Pay properly, tell the truth when it costs you, and answer honestly when asked.',
    body: [
      { h: 'The power imbalance is the whole issue',
        p: 'An employee cannot easily disagree with the person who signs their cheque, and they know it. Something that would be an ordinary conversation between equals becomes pressure when one party controls the other\'s income. That is not a reason for silence — it is a reason for care about who starts the conversation.' },
      { h: 'What people read as genuine',
        p: 'A quote that does not change after it is signed. A mistake fixed at your own cost. Someone kept on through a slow month. Wages paid on time when cash is tight. Those are noticed precisely because they cost something, and they cannot be faked over time.' },
      { h: 'Where it goes wrong',
        p: 'Prayer at a mandatory meeting, hiring or promotion that appears to track belief, an invitation from a boss that is hard to decline. Even with good intent, these put people in a position they cannot get out of gracefully — and they are the reason many people distrust the whole idea.' },
      { h: 'Being findable rather than loud',
        p: 'Most owners who do this well are simply known for it, and are asked. Answering honestly when someone raises it is a different act from raising it yourself, and it is the one that tends to be trusted.' },
    ],
    faqs: [
      { q: 'Can I put something about my faith on my website?', a: 'Yes — a customer choosing to read your site is not in the position an employee is. The considerations are different for the people who work for you.' },
      { q: 'Should I pray with a customer who asks?', a: 'If they asked, they asked. The caution is about initiating with someone who depends on you, not about responding to someone who does not.' },
      { q: 'What if my crew swear or drink at the Christmas do?', a: 'Setting standards for conduct at work is normal and fair. Setting standards for private life is neither, and it is where owners lose good people.' },
    ],
  },
  {
    slug: 'how-much-should-i-pay-myself',
    question: 'How much should I pay myself?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Enough that your household is not quietly subsidising the business. Owners routinely underpay themselves, call it sacrifice, and end up with a company that only appears profitable because its most expensive worker is free. That is not stewardship — it is a cost you have hidden from yourself.',
    body: [
      { h: 'An unpaid owner makes the numbers lie',
        p: 'If you work on the jobs and take nothing, every job looks more profitable than it is. Price the work as though you had to hire someone to do your part, because one day you will, and the price will not magically rise to meet it.' },
      { h: 'The household is a real stakeholder',
        p: 'A business funded by a marriage under strain, savings that do not get replaced, or a partner covering the mortgage is carrying a debt that never appears on any statement. It is still owed, and it usually comes due at the worst moment.' },
      { h: 'Underpaying yourself is not humility',
        p: 'It is often fear — that the business cannot afford you, and that finding out would force a decision. Finding out is the point. An owner who cannot pay himself properly has a pricing problem, and no amount of personal frugality fixes it.' },
      { h: 'What to actually do',
        p: 'Set a figure that covers your household honestly, pay it consistently, and let the business be measured against it. If it cannot carry that number, you have learned something true and early rather than false and late.' },
    ],
    faqs: [
      { q: 'What if the business genuinely cannot afford it yet?', a: 'Then say so out loud, put a date on it, and track it. A temporary decision with a review date is different from a permanent one you never made deliberately.' },
      { q: 'Salary or dividends?', a: 'That depends on your structure and jurisdiction and it materially affects tax — an accountant, not a rule of thumb, and not something to copy from another owner.' },
      { q: 'Is it wrong to pay myself well?', a: 'No. You are doing the work and carrying the risk. What is worth examining is whether everyone else is paid fairly too, not whether you are paid at all.' },
    ],
  },
  {
    slug: 'is-it-wrong-to-let-someone-go',
    question: 'Is it wrong to let someone go?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Keeping someone who cannot do the job is rarely kind — it is usually postponement, and the cost lands on the crew covering for them and on the person themselves, who stays in a role they are failing at. What matters is whether it was done honestly, with warning, and with the standard applied the same way for everyone.',
    body: [
      { h: 'The kindness question is the wrong way round',
        p: 'Owners ask whether letting someone go is unkind. The comparison that matters is against the alternative: months of a person knowing they are underwater, colleagues carrying it silently, and a conversation that eventually happens anyway with more resentment attached.' },
      { h: 'What makes it honest',
        p: 'That they knew. A specific standard, said out loud, with time and support to meet it, and a real chance to respond. "We have talked about this a few times" is not a standard. A dismissal that arrives as a surprise is a failure of management before it is a decision about a person.' },
      { h: 'Applied the same way for everyone',
        p: 'A rule enforced for one person and not another is worse than no rule at all — it tells the whole crew that the standard is really about who you like. That is the part people remember long after the individual has gone.' },
      { h: 'This is legal territory, not just moral',
        p: 'Notice, cause, documentation and process are set by employment standards where you are, and getting them wrong is expensive regardless of how fair you were. Get proper advice before you act, not after.' },
    ],
    faqs: [
      { q: 'What if they have family depending on the job?', a: 'That is real and worth weighing in how you do it — notice, a reference, timing. It is not usually a reason to keep someone in a role they cannot do, because the crew has families too.' },
      { q: 'Should I give more chances?', a: 'Give clear ones. Repeated vague chances are worse than one specific chance with a date, because nobody can act on a standard they cannot name.' },
      { q: 'How do I know if it is me rather than them?', a: 'Ask who was supposed to train them, whether the standard was ever written down, and whether anyone else has succeeded in the role. If the answer is nobody has, it is probably the role.' },
    ],
  },
  {
    slug: 'should-i-sell-the-business',
    question: 'How do I know whether to sell the business?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Separate two questions that usually get asked as one: whether the business could run without you, and whether you want it to. The first is a fact you can test. The second is yours, and no valuation answers it. Many owners discover they wanted the freedom rather than the sale.',
    body: [
      { h: 'Test the fact before the feeling',
        p: 'Could someone else run this? Who decides when you are away, who holds the customer relationships, what only exists in your head. That is answerable, and the answer often explains the restlessness better than any thinking about price does.' },
      { h: 'Selling and stepping back are different exits',
        p: 'An owner who wants his weekends back does not necessarily want to hand over the thing he built. Building a business that runs without you gets you most of what you were after and keeps the choice open. Selling closes it.' },
      { h: 'What a buyer is actually buying',
        p: 'Predictable revenue, clean books, systems that survive you, and customers attached to the business rather than to you personally. Which means the work that makes it sellable is the same work that makes it liveable — and you get the benefit either way.' },
      { h: 'The question underneath',
        p: 'Owners usually raise selling in a hard season, and a decision made from exhaustion is a decision made by the exhaustion. If the answer would be different after two proper weeks off, that is worth knowing before anyone is approached.' },
    ],
    faqs: [
      { q: 'What is my business worth?', a: 'Only a real valuation from someone who has seen the books can answer that, and multiples quoted in your trade are averages that may have nothing to do with you.' },
      { q: 'Should I tell my staff?', a: 'Eventually and carefully, and the timing has real consequences for retention. Take advice on it rather than deciding alone in the first week.' },
      { q: 'Is it wrong to sell something I built with people who trusted me?', a: 'No, but how you do it is where the trust is kept or lost — what they are told, when, and what happens to them in the deal.' },
    ],
  },
  {
    slug: 'does-god-want-my-business-to-succeed',
    question: 'Does God want my business to succeed?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Nobody can tell you that, and anyone who does is guessing on your behalf. Faithful people run businesses that fail and dishonest people run businesses that thrive, so success is not evidence of approval and struggle is not evidence of the opposite. What you can control is how it is run.',
    body: [
      { h: 'Why the question is usually asked',
        p: 'Almost always in a hard season, and underneath it is a different question: have I got this wrong. That is worth separating out, because the answer to "is this business viable" comes from the numbers and the answer to the other one does not come from a P&L at all.' },
      { h: 'What outcome does not tell you',
        p: 'Plenty of businesses built carefully by decent people fail because a market moved, a customer went under, or the timing was wrong. Plenty of others succeed while treating people badly. If outcomes measured character, the most upright operator in your trade would be the wealthiest, and you already know he is not.' },
      { h: 'The part that is actually yours',
        p: 'How you price. Whether people are paid properly and on time. Whether your word holds when keeping it costs you. Whether the estimate matches the invoice. Those are decisions rather than outcomes, and they are the same whether the year is good or bad.' },
      { h: 'Be careful what you do with the answer',
        p: 'Reading a good quarter as approval sets you up to read the next bad one as judgement — and that is when owners make frightened decisions: dropping a price to survive a month, taking a client they know is trouble. The pressure feels like discernment and it is not.' },
    ],
    faqs: [
      { q: 'Does that mean prayer makes no difference?', a: 'Many owners would say it steadies them, and steadier decisions are better decisions. That is different from a guaranteed outcome, and nobody honest will promise you one.' },
      { q: 'How do I know if I should keep going?', a: 'From whether the business can be made to work — whether a typical job is profitable, whether the cash lasts, whether you can fix what is broken. Those are answerable. Reading signs into a slow month is not.' },
      { q: 'Is it wrong to want it to succeed?', a: 'No. Wanting to build something that lasts and provides for people is not a lesser motive. The question worth watching is what you would be willing to do to get there.' },
    ],
  },
  {
    slug: 'will-giving-more-grow-my-business',
    question: 'Will giving more make my business more profitable?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'It might not, and you should not give expecting it to. Generosity framed as an investment with a return is not generosity — it is a transaction with a longer settlement date. Give because you decided to, at a level that does not put wages or suppliers at risk, and let the return be nobody\'s expectation.',
    body: [
      { h: 'The promise being made to you',
        p: 'Give and it will come back multiplied, usually with a story attached. The stories are real; so are all the ones nobody tells, where someone gave sacrificially and the business still closed. A claim that only collects its successes is not evidence, it is marketing.' },
      { h: 'What it costs when it does not work',
        p: 'Not just money. An owner who gave expecting a return and did not get one is left concluding he did not give enough, or did not believe hard enough. That is a worse place than where he started, and it is why the framing matters more than the amount.' },
      { h: 'Give from what is actually yours',
        p: 'The account holds tax you collected and deductions withheld from payroll. Giving from money owed to somebody else is not generosity — it relocates the cost onto a supplier or the tax authority. Give from what the business has genuinely earned and paid you.' },
      { h: 'A cleaner way to think about it',
        p: 'Decide what you want to give and why, at a level you could sustain through a bad year, and treat it as spending rather than sowing. If it is worth doing, it is worth doing when nothing comes back — and if it is only worth doing because something might, it was never really giving.' },
    ],
    faqs: [
      { q: 'What about people who say it worked for them?', a: 'Some businesses grow after their owners started giving. Some grow after their owners started running four miles a week. Neither tells you the cause, and the people it did not work for are not writing books.' },
      { q: 'Should I stop giving if money is tight?', a: 'That is yours to decide. What is worth avoiding is giving money you owe someone else, or giving more in a crisis in the hope it will resolve the crisis.' },
      { q: 'Is it wrong to give strategically — sponsoring a local team, say?', a: 'No, and it is honest as long as you call it what it is. Marketing that also does good is fine. Marketing described as generosity is where it goes wrong.' },
    ],
  },
  {
    slug: 'is-it-a-lack-of-faith-to-plan',
    question: 'Is it a lack of faith to plan and forecast?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'No. Diligence and trust are not opposites, and "it will work out" is not a cash-flow plan. The tradition this question comes from is full of counting costs before building and storing grain before a famine. Planning is what makes it possible to keep your word later.',
    body: [
      { h: 'Presumption is not faith',
        p: 'Taking on an obligation on the assumption things will work out — and calling that trust — is the failure worth naming. It is the reason an owner signs for equipment he cannot service and then has to choose between the payment and payroll. Nobody is served by that, least of all the people relying on the wage.' },
      { h: 'A forecast is a promise-keeping tool',
        p: 'Knowing week nine is tight is what lets you tell a supplier early, or not take a job you cannot resource. Owners without a forecast do not avoid those problems; they meet them later, with fewer options and usually with somebody else absorbing the surprise.' },
      { h: 'What planning cannot do',
        p: 'It cannot tell you what happens. A thirteen-week forecast is a set of assumptions, and the honest version says which ones it rests on — that June collections land like May\'s, that the big invoice does not slip. Planning does not remove uncertainty; it makes it visible early enough to do something.' },
      { h: 'Where the worry usually comes from',
        p: 'Owners who ask this have often been told that detailed planning shows a lack of trust. It is worth asking who benefits from that idea. An owner who does not look closely at his numbers is easier to sell things to.' },
    ],
    faqs: [
      { q: 'How far ahead should I plan?', a: 'Thirteen weeks is the common horizon for cash because it is far enough to act and near enough to be more than guesswork. Longer than that becomes a story about the future.' },
      { q: 'Is it wrong to hold a large cash reserve?', a: 'Holding a buffer is what lets you pay people through a slow month and refuse work that would compromise you. That is not hoarding, it is capacity to keep commitments.' },
      { q: 'What if the numbers say stop and I feel I should continue?', a: 'Both are information. But make the decision knowing what the numbers say rather than avoiding them, and say it out loud to someone who is not depending on you for a wage.' },
    ],
  },
  {
    slug: 'what-if-one-customer-is-most-of-my-revenue',
    question: 'What if one customer is most of my revenue?',
    category: 'Money',
    updated: '2026-09-02',
    answer:
      'Anything over about a fifth from one customer is a risk worth naming, and over a third means they effectively set your prices, your schedule and your payment terms. You may not feel it while the relationship is good. You will feel all of it at once if they leave, merge, or change buyer.',
    body: [
      { h: 'It is not disloyalty to notice',
        p: 'Owners avoid this thought because the customer has been good to them. Concentration is a structural fact, not a judgement about anyone. The same customer can be excellent and be the largest single threat to the business at the same time.' },
      { h: 'The hidden cost is in what you cannot say',
        p: 'When one client is a third of revenue, you cannot really push back on a late payment, an unreasonable date, or scope that keeps growing. That shows up as thinner margin on your biggest account, which is exactly backwards.' },
      { h: 'Fix it by adding, not by cutting',
        p: 'Nobody sensible fires a large customer to reduce concentration. You dilute it by winning others — which takes time, which is why this is worth starting while things are good rather than after the phone call.' },
      { h: 'Know what happens on day one',
        p: 'If they went tomorrow: how many weeks of payroll do you have, what would you cut, who would you have to let go. Owners who have never answered that make the worst decisions in the first fortnight, because they are deciding while frightened.' },
    ],
    faqs: [
      { q: 'What percentage is safe?', a: 'Under 20% from any single customer is the common rule of thumb, and like all rules of thumb it depends on the contract, the notice period and how easily the work could be replaced.' },
      { q: 'Should I tell them I am reducing my dependence?', a: 'No need. It is your business risk to manage, and framing it as a concern about them turns an internal decision into an awkward conversation.' },
      { q: 'Is it worth taking lower-margin work to diversify?', a: 'Sometimes, deliberately and temporarily. What is not worth it is drifting into unprofitable work and calling it diversification.' },
    ],
  },
  {
    slug: 'what-do-i-do-about-a-customer-who-will-not-pay',
    question: 'What do I do about a customer who will not pay?',
    category: 'Money',
    updated: '2026-09-02',
    answer:
      'Move earlier than feels comfortable. Most owners wait months, then act angrily, which is the worst order. A firm, unemotional sequence starting at day one past due collects far more than a furious call at ninety days — and by ninety days you are one creditor among several.',
    body: [
      { h: 'Speed matters more than force',
        p: 'The invoices that get paid are the ones that were chased first. A business in trouble pays whoever is most present, and the supplier who waits three months politely is the one who gets paid last or not at all.' },
      { h: 'Have a sequence and use it every time',
        p: 'A reminder at due, a call at seven days, a written notice at thirty, and a decision at sixty. Written down and applied to everyone, it stops being a confrontation and becomes a process — which is easier for you and less personal for them.' },
      { h: 'Pick up the phone',
        p: 'Email is easy to ignore, especially by someone avoiding a conversation about money. A call finds out whether this is a dispute, a cash-flow problem, or an invoice nobody ever received — and those have completely different fixes.' },
      { h: 'Know the point where you stop',
        p: 'At some balance and some age, chasing costs more than collecting. Decide that line in advance rather than in the moment, and take advice before formal action — the rules on notice, interest and small claims are jurisdictional and getting them wrong is expensive.' },
    ],
    faqs: [
      { q: 'Should I keep working for them meanwhile?', a: 'Rarely. Continuing to deliver while unpaid increases what you can lose and tells them the terms are optional.' },
      { q: 'Should I charge interest on late payment?', a: 'Many jurisdictions allow it and having it in your terms changes behaviour. Whether to actually apply it is a separate call, case by case.' },
      { q: 'When should I involve a lawyer or collection agency?', a: 'When the amount justifies the cost and your own sequence has run out. Get advice on the timing — some steps have to happen in order to preserve your options.' },
    ],
  },
  {
    slug: 'should-i-take-on-a-job-thats-bigger-than-anything-ive-done',
    question: 'Should I take a job bigger than anything I have done?',
    category: 'Pricing',
    updated: '2026-09-02',
    answer:
      'The risk is rarely the work — it is the cash. A job twice your usual size often means paying materials and wages for weeks before any money arrives, and businesses fail on big jobs they delivered perfectly. Work out the cash timing before you work out whether you can do it.',
    body: [
      { h: 'Map the money, week by week',
        p: 'When do you pay for materials, when does payroll fall, when do you actually get paid. If there are six weeks where money only goes out, that gap is the real question. Delivering well and running out of cash in week five is a common way for good businesses to fail.' },
      { h: 'Negotiate terms before price',
        p: 'A deposit, progress payments, or materials supplied by the customer change the risk more than a few points of margin do. Most owners argue about the price and accept the terms, when the terms are what would sink them.' },
      { h: 'Estimate honestly, then add for the unknown',
        p: 'You have not done this size before, which means your estimate is built on jobs that were not like it. Things you have never had to coordinate take longer than you think. Pricing your first big one at your usual margin usually means doing it at a loss.' },
      { h: 'Ask what it costs you elsewhere',
        p: 'A job that consumes your whole crew for two months is also a decision to turn away everything else, and to be unavailable to the regulars who kept you going. That cost is real and rarely counted.' },
    ],
    faqs: [
      { q: 'What deposit should I ask for?', a: 'Enough to cover materials and the first stretch of labour. What is standard varies by trade and jurisdiction, and some places regulate deposits — worth checking rather than assuming.' },
      { q: 'What if they will not agree to progress payments?', a: 'That is information. A customer unwilling to pay along the way is asking you to finance their project, and you should price and decide accordingly.' },
      { q: 'Should I take it just for the reputation?', a: 'A reference is worth something. It is worth less than solvency, and a job that ends in a dispute is a reference in the wrong direction.' },
    ],
  },
  {
    slug: 'how-do-i-stop-quoting-and-never-hearing-back',
    question: 'How do I stop quoting and never hearing back?',
    category: 'Pricing',
    updated: '2026-09-02',
    answer:
      'Usually the quote is doing too little. A number with no scope gives a customer nothing to compare except price, so they compare it against someone cheaper. Say what is included, what is not, and what happens if something is found — then follow up once, by phone.',
    body: [
      { h: 'A bare number invites a race to the bottom',
        p: 'If three quotes are just figures, the only visible difference is the figure. Spelling out what you are actually doing — materials, access, making good, warranty — gives a customer something to weigh, and it is the only defence against being compared with someone who left things out.' },
      { h: 'Qualify before you spend the evening',
        p: 'Quoting is unpaid work. Before you build a detailed one, find out the timeline, whether they have other quotes, and roughly what they expected to spend. It feels blunt and it saves entire evenings.' },
      { h: 'Follow up once, and call',
        p: 'Most owners send it and wait. One call a few days later — not to chase but to ask if anything needs explaining — recovers a surprising number, because the common reason for silence is confusion or an unrelated delay, not rejection.' },
      { h: 'Count what you win',
        p: 'If you are winning almost everything, you are probably too cheap. If you are winning very little, either the price is wrong for the market or the quote is not doing its job. You cannot tell which without keeping score.' },
    ],
    faqs: [
      { q: 'Should I charge for quotes?', a: 'Some trades do, for detailed work, and it filters out tyre-kickers. It also loses some genuine enquiries — worth testing on your most time-consuming quote type first.' },
      { q: 'How long should I wait before following up?', a: 'Two to five days for most work. Long enough that they have read it, soon enough that you are still the one they remember.' },
      { q: 'What if they say I am too expensive?', a: 'Ask what they are comparing it with. Half the time it is not the same scope, and that is a conversation you can have. The other half tells you something useful about that customer.' },
    ],
  },
  {
    slug: 'how-much-cash-should-i-keep-in-the-business',
    question: 'How much cash should I keep in the business?',
    category: 'Money',
    updated: '2026-09-02',
    answer:
      'Enough to cover fixed costs and payroll through your worst realistic month — commonly two to three months. And remember part of any balance is not yours: it holds the sales tax you collected and the deductions withheld from payroll, neither of which is spendable.',
    body: [
      { h: 'Work from your own numbers, not a rule',
        p: 'Add up what leaves regardless of whether you win work: wages, rent, insurance, loan payments, subscriptions. Multiply by how long a bad stretch has actually lasted for you before. That figure is yours; someone else\'s three-month rule is not.' },
      { h: 'Subtract what you owe before you decide you have it',
        p: 'An owner who thinks he has forty thousand and actually has twenty-two after remittances is not being cautious, he is mistaken. Take the tax and deductions out of the number before you plan anything with it.' },
      { h: 'What the buffer actually buys',
        p: 'The ability to say no. To refuse a job priced below cost, to walk away from a customer who treats your crew badly, to keep someone on through a quiet winter. Thin cash removes all of those choices, and the pressure always lands on the people with the least say.' },
      { h: 'Cash and profit are different problems',
        p: 'A profitable business can run out of money if customers pay slowly, and an unprofitable one can look fine while a big deposit sits in the account. Know which one you have, because the fixes are opposite.' },
    ],
    faqs: [
      { q: 'Should I hold it in a separate account?', a: 'Most owners who do it successfully do. Money that is visible in the main balance tends to get spent on something that felt urgent at the time.' },
      { q: 'Is it better to pay down debt or build a buffer?', a: 'Usually some buffer first — debt with no cash means one bad month forces a worse decision. Beyond that it depends on the rate and your situation.' },
      { q: 'What if I have never had a reserve?', a: 'Start with one month and build. A small buffer changes decisions immediately; waiting until you can do it properly usually means never starting.' },
    ],
  },
  {
    slug: 'should-i-promote-my-best-tech-to-foreman',
    question: 'Should I promote my best tech to foreman?',
    category: 'People',
    updated: '2026-09-02',
    answer:
      'Being excellent at the work and being able to run people are different skills, and promoting for the first while hoping for the second is how businesses lose a great tradesperson and gain a struggling supervisor. Ask whether they want it, and whether anyone has ever shown them how.',
    body: [
      { h: 'The trap is treating promotion as a reward',
        p: 'A raise rewards good work. A supervisory role is a different job, and giving it as a prize sets someone up to fail at something they never asked to do — then to feel they let you down when it goes badly.' },
      { h: 'Ask them, properly',
        p: 'Some of the best tradespeople have no interest in managing anyone and will say so if the question is genuinely open. Make it possible to decline without it costing them anything, or you will get a yes you cannot rely on.' },
      { h: 'Nobody is born knowing how',
        p: 'Running a crew means giving unwelcome instructions, having awkward conversations, and planning other people\'s days. If nobody has shown them, "they are not a natural leader" usually means "we promoted them and left them to it".' },
      { h: 'Make the standard explicit',
        p: 'What decisions are theirs, what needs a call to you, what does the job look like when it is done right. A new foreman without those either asks about everything or guesses, and both look like the wrong person.' },
    ],
    faqs: [
      { q: 'What if they turn it down?', a: 'Then you have kept a great tradesperson and learned something. Pay them well for what they are actually good at — a senior technician who never wants to supervise is not a failure.' },
      { q: 'Should I promote from outside instead?', a: 'Sometimes. An experienced foreman brings skills you cannot teach quickly, but starts with no credibility on your crew. Both routes have a cost.' },
      { q: 'How do I know if it is working?', a: 'Whether things happen when you are not there, and whether the crew go to them or straight past them to you. The second is the honest signal.' },
    ],
  },
  {
    slug: 'how-do-i-take-a-holiday',
    question: 'How do I take a holiday without the business falling over?',
    category: 'The owner',
    updated: '2026-09-02',
    answer:
      'Not by working harder before you go. By finding out, in advance and on purpose, what only you can do — and handing each of those to someone with the standard written down. A week away is the cheapest test of owner dependence there is, and the findings are more useful than the rest.',
    body: [
      { h: 'Do a dry run first',
        p: 'Be unreachable for one working day while still in town. Whatever breaks, or whatever people wait to ask you, is your list. That day costs nothing and tells you more than any amount of planning.' },
      { h: 'Hand over decisions, not just tasks',
        p: 'Telling someone what to do while you are away just moves the questions to your phone. Give them the decision, the limits, and permission to be wrong occasionally — that is the difference between cover and delegation.' },
      { h: 'Tell customers before you go',
        p: 'Who to call, when you are back, and that the person covering can actually decide things. Most upset about an absent owner is really upset about surprise, and it is entirely avoidable.' },
      { h: 'The list is the point',
        p: 'Whatever went wrong is not a reason not to go again. It is the map of what has to be written down, and you would not have found it any other way. Owners who never leave never learn where the business depends on them until something forces the issue.' },
    ],
    faqs: [
      { q: 'What if there is genuinely nobody to cover?', a: 'Then that is the finding, and it is worth acting on. A business that cannot survive one week without its owner is a business with one point of failure, whatever else is going well.' },
      { q: 'Should I check in while away?', a: 'A short scheduled window is more honest than pretending you will not look. Constantly available is not a holiday and it teaches everyone to wait for you.' },
      { q: 'How long should the first one be?', a: 'Longer than a long weekend, because a weekend can be absorbed by everyone just waiting. A week starts to reveal the real dependencies.' },
    ],
  },
  {
    slug: 'should-i-work-on-sundays',
    question: 'Should I work on Sundays?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'This is a conviction question and people who share your beliefs land in different places on it. What is worth separating: whether you are choosing to work, or whether the business is built so you have no choice. The second is the fixable part, and it is usually the real problem.',
    body: [
      { h: 'Choosing to and having to are different',
        p: 'An owner who works Sunday because an emergency call came in has made a decision. An owner who works every Sunday because the week does not fit into six days has a business that requires it — and no amount of conviction resolves that, because the pressure returns next week.' },
      { h: 'What consistently working seven days actually costs',
        p: 'Judgement first. Decisions made tired are worse, and the ones made worst are the ones about people and price. Then your household, which is carrying a cost that appears on no statement. Rest is an input to the business, not a reward for finishing.' },
      { h: 'It sets the standard for everyone else',
        p: 'A crew watching an owner work every Sunday learns what is expected, whatever the handbook says. If you would not want them living that way, it is worth noticing that you are modelling it.' },
      { h: 'Emergencies are a real category',
        p: 'Trades that keep people warm, dry and safe get genuine emergencies, and most traditions have always made room for necessary work. The question is whether "emergency" has quietly expanded to mean "anything a customer asked for".' },
    ],
    faqs: [
      { q: 'Is it wrong to charge more for Sunday work?', a: 'No — it costs more to deliver, in wages and in your own time. Charging for it is honest, and it also stops it being the default.' },
      { q: 'What if my competitors work Sundays and I lose work?', a: 'You may lose some. Owners who protect one day usually find the work redistributes rather than disappears, but that is a real trade-off to make with open eyes.' },
      { q: 'What does the answer depend on?', a: 'Your own convictions, which nobody else should settle for you. What is not a conviction question is whether the business is structured so that you have no choice.' },
    ],
  },
  {
    slug: 'is-ambition-wrong',
    question: 'Is it wrong to be ambitious about my business?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Wanting to build something that lasts, employs people well and outlives you is not a lesser motive. The question worth watching is not how much you want, but what you would be willing to do to get it — and whether "bigger" has quietly replaced any reason for being bigger.',
    body: [
      { h: 'Ambition and greed are not the same word',
        p: 'One is wanting to build something good; the other is wanting more regardless of cost to anyone. They look similar from outside and feel completely different from inside, and the test is what you do when the two conflict.' },
      { h: 'Bigger is not automatically better',
        p: 'Doubling revenue can mean doubling headaches, thinner margins and an owner further from the work he liked. Plenty of owners chase growth and end up with a larger version of a business they had stopped enjoying. Be specific about what the growth is for.' },
      { h: 'The test is what you would trade',
        p: 'Would you underpay to hit the number. Would you promise a date you cannot hold. Would you take a client you know treats people badly. Ambition that stops at those lines is a different thing from ambition that does not.' },
      { h: 'Low ambition is not automatically humility',
        p: 'A business kept deliberately small can also be a business that underpays, cannot invest, and cannot survive a bad quarter. Staying small is a choice with consequences too, and it should be made deliberately rather than out of unease.' },
    ],
    faqs: [
      { q: 'How do I know if I have crossed a line?', a: 'Usually you already know, and it shows up as reluctance to say out loud what you did. Someone who is not depending on you for a wage is worth asking.' },
      { q: 'Is it wrong to want to be wealthy?', a: 'Wanting security, the ability to be generous and something to leave behind is ordinary. Where it goes wrong is when the number becomes the only thing being measured.' },
      { q: 'Should I have a number I stop at?', a: 'Some owners find one useful — enough is a real concept and very few people ever define it. Others find the useful limit is about how, not how much.' },
    ],
  },
  {
    slug: 'should-i-do-free-work-for-my-church',
    question: 'Should I do free work for my church or a charity?',
    category: 'Kingdom',
    updated: '2026-09-02',
    answer:
      'Give deliberately or charge properly — the trouble comes from the middle, where nobody said what it was. Decide in advance what you are donating, put it in writing as a quote at zero or reduced cost, and treat it with the same scheduling and standards as paid work.',
    body: [
      { h: 'Write it down even when it is free',
        p: 'A scope, a price, and what is being donated. It sounds excessive for a favour, and it is the thing that prevents the favour turning into six months of unpaid extras with a strained relationship at the end.' },
      { h: 'Free work still costs somebody',
        p: 'Materials, your crew\'s wages, and the paid work you did not take that week. That is fine if you chose it. It stops being fine when it is quietly funded by paying yourself less or by staff working a Saturday.' },
      { h: 'Cap it before you start',
        p: 'Decide how many hours or how much material, and say so at the beginning. "Whatever it takes" for an unpriced job is where resentment comes from — and resentment about a gift is worse than not having given it.' },
      { h: 'Scope creep is harder to refuse here',
        p: 'People ask for more precisely because it is free, and saying no feels ungracious. A written scope makes that a reference to a document rather than a refusal of a person, which is much easier for everyone.' },
    ],
    faqs: [
      { q: 'Should I do it at cost instead of free?', a: 'Often cleaner. Covering materials means the gift is your labour, which is easier to define, easier to cap and easier for them to accept.' },
      { q: 'Can I claim it against tax?', a: 'That depends entirely on jurisdiction and structure, and donated services are treated differently from donated goods in many places. Ask your accountant rather than assuming.' },
      { q: 'What if the work goes wrong?', a: 'You are usually just as liable as on paid work. Insurance, permits and standards all still apply — free does not mean informal.' },
    ],
  },
  {
    slug: 'my-partner-and-i-disagree-about-the-business',
    question: 'What if my spouse and I disagree about the business?',
    category: 'The owner',
    updated: '2026-09-02',
    answer:
      'Usually you are not arguing about the thing you are arguing about. One of you is carrying a risk the other cannot see the size of. Put the actual numbers on the table — what it costs, what happens if it fails — and the conversation changes from a disagreement about attitude to a decision about facts.',
    body: [
      { h: 'The household is a real stakeholder',
        p: 'If the business is funded by savings, a mortgage, or a partner covering the bills through a lean stretch, they have taken on risk without holding the information. Frustration that looks like a lack of support is usually a reasonable response to not being told.' },
      { h: 'Share the numbers, not the mood',
        p: 'Owners tend to bring home how the day felt. What actually helps is what came in, what is owed, how long the money lasts. Someone can weigh a runway of eleven weeks. Nobody can weigh "it was a rough one".' },
      { h: 'Agree the line in advance',
        p: 'What would have to be true for you to stop, or change course, or take a wage from somewhere else. Decided together while calm, that is a plan. Decided alone in a crisis, it is the thing that breaks trust.' },
      { h: 'They may be seeing something you cannot',
        p: 'The person closest to you sees the hours, the sleep and the mood, and they are not sitting inside the optimism required to keep going. Being told the business is costing more than it returns is worth hearing properly before dismissing it.' },
    ],
    faqs: [
      { q: 'What if they want me to quit and I do not?', a: 'That is a real conflict and it will not be settled by winning an argument. It is one of the few situations where a third party — a counsellor, or an advisor you both trust — is genuinely worth it.' },
      { q: 'Should they be involved in the business?', a: 'Only if both of you want it. Involving a reluctant partner to prove openness usually adds a second strained relationship rather than solving the first.' },
      { q: 'How much detail is too much?', a: 'Regular and simple beats occasional and exhaustive. A short monthly conversation about the same four numbers is worth more than a spreadsheet nobody opens.' },
    ],
  },
  {
    slug: 'how-do-i-handle-a-customer-who-lies',
    question: 'What do I do about a customer who is dishonest?',
    category: 'Conviction',
    updated: '2026-09-02',
    answer:
      'Document, decide, and be willing to walk. Most owners tolerate it far too long because the invoice is large, and the cost compounds — disputed variations, scope that keeps moving, a final payment that never quite arrives. Being trustworthy does not oblige you to keep working for someone who is not.',
    body: [
      { h: 'Write everything down, from now',
        p: 'What was agreed, what changed, what was said on site and when. Not to build a case, but because the argument later is always about what was agreed, and the person with the record wins it. Confirming a phone call by email takes a minute.' },
      { h: 'Stop early rather than late',
        p: 'The instinct is to finish and get paid. Usually the exposure grows with every week — more materials in, more wages out, more scope disputed. Pausing while you are owed a little is nearly always better than finishing while you are owed a lot.' },
      { h: 'Do not match it',
        p: 'The temptation to cut a corner because they are, or to overstate a variation because they underpaid, is where an owner loses the thing that makes him different. It also destroys your position if it ever goes formal.' },
      { h: 'Take advice before acting formally',
        p: 'Stopping work, placing a lien, or terminating a contract all have rules that vary by jurisdiction and by what your contract says. Doing the right thing in the wrong order can leave you in the wrong.' },
    ],
    faqs: [
      { q: 'Should I finish the job to get paid?', a: 'Only if you believe the payment is genuinely coming. If they have already broken terms once, finishing usually increases what you are owed rather than what you collect.' },
      { q: 'Can I refuse to work for someone?', a: 'Generally yes, subject to your contract and anti-discrimination law. The safe reason is capacity or fit, and taking advice before terminating an existing contract is worth it.' },
      { q: 'Should I warn other trades?', a: 'Be careful. Sharing your own factual experience is different from making claims about someone\'s character, and the second can create liability of its own.' },
    ],
  },
  {
    slug: 'do-i-need-a-fractional-cfo',
    question: 'Do I need a fractional CFO?',
    category: 'Getting help',
    updated: '2026-09-02',
    answer:
      'Usually not until the decisions get big enough that being wrong is expensive — raising money, buying a business, a sale, or complex financing. Below that, most owners do not have a CFO-shaped problem. They have numbers they cannot see clearly and nobody to think out loud with, which is a different and cheaper thing to fix.',
    body: [
      { h: 'What a fractional CFO actually does',
        p: 'Financial strategy at the level above bookkeeping: modelling, funding, structuring a deal, building the reporting a board or a lender expects. Experienced people doing high-stakes work a few days a month, typically several hundred to a few thousand a month depending on scope and market.' },
      { h: 'The three roles get confused constantly',
        p: 'A bookkeeper records what happened. An accountant files, advises on tax and structure, and signs things. A CFO decides what the numbers mean and what to do next. Most small businesses need the first two reliably and the third only occasionally — and hire the wrong one because the titles blur.' },
      { h: 'When it is genuinely worth it',
        p: 'A transaction with real money at stake, lenders or investors who need convincing, or complexity you cannot hold in your head. If you are raising money or selling, the fee is small against getting it wrong. That is a real yes.' },
      { h: 'When it is not',
        p: 'If the actual problem is that you do not know your margin by job, are guessing at cash, and want somebody to argue a decision through with — that is not a CFO-scale problem. Fix the visibility first, and you may find the question answers itself.' },
      { h: 'The fractional model is already a compromise — worth understanding why',
        p: 'Nobody hires two days a month because two days is the right amount. They do it because full-time is unaffordable. So the model already accepts that for the other eighteen working days you are on your own — and the decisions do not wait for the scheduled day. Whether to hold a price, whether this job is worth taking, whether you can carry another wage: those land on a Tuesday.' },
      { h: 'What changes the size of the person you need',
        p: 'If the daily thinking is covered — the books read, the margin visible, the decision argued through while it is actually in front of you — then what is left for a senior finance person is the genuinely senior work: the transaction, the funding round, the thing that has to be signed. That is fewer days, or only when it matters, rather than a permanent retainer to cover a gap.' },
    ],
    faqs: [
      { q: 'What does a fractional CFO cost?', a: 'Commonly several hundred to a few thousand a month depending on days, seniority and market. Worth getting two or three quotes; the range is wide and scope varies a lot.' },
      { q: 'Can Eliv8 OS replace one?', a: 'Not for the senior work — it cannot sit in a funding negotiation or sign off on a transaction, and you should not want software to. What it does is cover the days a fractional CFO is not there, which is most of them. That usually means needing less of the person, not none of them.' },
      { q: 'What should I fix before hiring one?', a: 'Clean books and knowing what individual jobs actually make. A CFO working from unreliable numbers produces confident conclusions built on sand, and you pay for both.' },
    ],
  },
  {
    slug: 'fractional-cfo-vs-bookkeeper-vs-accountant',
    question: 'Bookkeeper, accountant, or CFO — which do I actually need?',
    category: 'Getting help',
    updated: '2026-09-02',
    answer:
      'A bookkeeper records what happened. An accountant files it, advises on tax and structure, and signs things. A CFO decides what it means and what to do next. Nearly every small business needs the first two consistently. The third is usually needed occasionally, not permanently.',
    body: [
      { h: 'Get the bookkeeping right first',
        p: 'Every other role is built on it. An accountant working from bad records produces expensive corrections, and anyone giving strategic advice from them is guessing well. If one thing gets fixed this quarter, make it this.' },
      { h: 'Your accountant is underused by most owners',
        p: 'Most people speak to theirs once a year, at filing. They can usually tell you a great deal about structure, timing and what your figures actually mean — but only if asked, and only if the records are good enough to say anything from.' },
      { h: 'The CFO-shaped gap is usually a visibility gap',
        p: 'Owners reach for a CFO when they feel they are flying blind. Often the real problem is not the absence of a senior finance brain — it is not knowing what each job makes, or when cash gets tight. That is answerable without a monthly retainer.' },
      { h: 'What none of them do',
        p: 'None of them is there on a Tuesday when you are deciding whether to drop a price to win a bid. That gap between the annual accountant meeting and the daily decision is where most owners actually live, and it is not usually solved by hiring further up the chain.' },
    ],
    faqs: [
      { q: 'Can one person do all three?', a: 'In small businesses, sometimes — but be clear which hat is on. Advice about what to do next is a different service from recording what already happened, and the second does not qualify anyone for the first.' },
      { q: 'Do I still need a bookkeeper if I use QuickBooks?', a: 'Usually yes. The software records; someone still has to categorise correctly, reconcile, and catch mistakes. Bad data entered efficiently is still bad data.' },
      { q: 'Where does Eliv8 OS sit?', a: 'Beside them, not instead of them. It reads your books and helps you think about decisions day to day. It does not do your bookkeeping, file anything, or replace professional advice — and it says so when a question needs one of them.' },
    ],
  },
  {
    slug: 'can-software-replace-a-business-coach',
    question: 'Can software replace a business coach or advisor?',
    category: 'Getting help',
    updated: '2026-09-02',
    answer:
      'Not entirely, and anyone claiming otherwise is selling. What software can do that a coach cannot is read your actual numbers before it says anything, remember every decision you have made, and be there on the Tuesday you need it rather than the third Thursday of the month.',
    body: [
      { h: 'What a good coach gives you',
        p: 'Accountability, someone who has run a business, and a relationship where hard things get said. Real value, and there is a reason owners pay hundreds to a couple of thousand a month for it.' },
      { h: 'What a coach usually cannot do',
        p: 'See your books. Most advice at that level is given from what an owner reports, and owners report the version they carry in their heads. A conversation about margin without the margin in front of both people is two opinions.' },
      { h: 'Where software genuinely wins',
        p: 'Continuity and evidence. It reads the actual figures, remembers what you decided in March and why, notices when something you said contradicts something you said before, and is available when the decision is actually in front of you rather than at the next scheduled call.' },
      { h: 'Where it does not',
        p: 'It has never run a business, has no stake in yours, and cannot sit across a table when you are at the end of your rope. It also cannot see the room, the crew\'s mood, or your marriage — and it should say so rather than pretend otherwise.' },
    ],
    faqs: [
      { q: 'What does a business coach cost?', a: 'Commonly $500 to $2,500 a month depending on seniority and format, with masterminds and group programmes at the lower end.' },
      { q: 'Is it better to have both?', a: 'For many owners, yes, and it is usually cheaper than it sounds. The software handles the continuous thinking, which is most of it; the person handles what needs a person. That tends to mean fewer sessions rather than none, and better ones — you arrive with the numbers already understood instead of spending half the call explaining them.' },
      { q: 'How do I tell a good coach from a bad one?', a: 'A good one asks about your numbers and disagrees with you. Be wary of anyone whose main product is encouragement, or who promises a result they cannot control.' },
    ],
  },
  {
    slug: 'outsourced-cfo-services-for-contractors',
    question: 'What are the options for outsourced financial help in the trades?',
    category: 'Getting help',
    updated: '2026-09-02',
    answer:
      'Four broadly: a bookkeeper for the records, an accountant for filing and structure, a fractional or outsourced CFO for high-stakes decisions, and software that reads your books and helps you think day to day. Most owners need the first two, occasionally the third, and are missing the fourth entirely.',
    body: [
      { h: 'What the trades actually struggle with',
        p: 'Rarely the annual accounts. It is job-level profitability, cash timing across weeks, and pricing that lags material costs. Those are the things that quietly move margin, and none of them is solved by a better year-end.' },
      { h: 'The gap between annual and daily',
        p: 'An accountant sees you once or twice a year. A decision about whether to drop a price, take a big job, or hire another tech happens on a Tuesday. Almost every owner makes those alone, and that gap is where most of the money is lost or made.' },
      { h: 'Cost is not the only difference',
        p: 'A retainer buys expertise on a schedule. Software buys availability and memory. They fail in opposite directions — one is not there when you need it, the other has never run a business — which is why the sensible answer for many owners is both, not a choice.' },
      { h: 'Why part-time help exists at all',
        p: 'Nobody buys two days a month because two days is right. They buy it because a full-time finance person is out of reach for a business this size. Every part-time arrangement is a compromise between what you need and what you can afford — and the compromise is paid for in the days nobody is there.' },
      { h: 'The cheapest thing you can do is shrink what you are buying days for',
        p: 'If the routine thinking is already handled — the numbers read, the margin visible per job, the ordinary decision worked through when it happens — the expensive person is only needed for the genuinely expensive questions. Owners who do this tend to buy fewer days at a higher grade, which is a better use of the same money than a retainer covering ground that did not need a human.' },
      { h: 'Whatever you choose, fix the inputs',
        p: 'Every one of these gets better with clean books and knowing what a finished job actually cost. Buying advice on top of numbers you do not trust means paying someone to be confidently wrong.' },
    ],
    faqs: [
      { q: 'Is outsourced CFO the same as fractional CFO?', a: 'Broadly yes — both mean senior finance help part-time. Outsourced sometimes implies a firm rather than an individual, and scope varies more than the titles suggest.' },
      { q: 'What is the cheapest thing that helps most?', a: 'Knowing what each job quoted, cost and made. It is unglamorous, it costs nothing but discipline, and it answers more questions than any retainer.' },
      { q: 'Where does Eliv8 OS fit?', a: 'The daily layer — reading your books, remembering your decisions, arguing the hard calls both ways. It is not a substitute for a bookkeeper, an accountant, or a CFO on a transaction, and it will tell you when a question belongs to one of them.' },
    ],
  },
]

/** Categories in the order they should appear on the index. */
export const ANSWER_CATEGORIES = ['Pricing', 'Money', 'Hiring', 'People', 'The owner', 'Getting help', 'Conviction', 'Kingdom']

export function answerBySlug(slug) {
  return ANSWERS.find(a => a.slug === slug) ?? null
}
