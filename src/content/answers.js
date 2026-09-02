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
]

/** Categories in the order they should appear on the index. */
export const ANSWER_CATEGORIES = ['Pricing', 'Money', 'Hiring', 'People', 'The owner', 'Conviction', 'Kingdom']

export function answerBySlug(slug) {
  return ANSWERS.find(a => a.slug === slug) ?? null
}
