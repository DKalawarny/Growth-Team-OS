/**
 * Unstuck Map — situation pages.
 *
 * ⭐⭐ WHY THESE AND NOT KEYWORD PAGES. The head terms in this category are
 * unwinnable: "how to get out of debt" and "I hate my job" are among the most
 * commercially contested phrases on the internet, held by NerdWallet, Ramsey,
 * Reddit and debt consolidators paying serious money per click. There is no
 * version of this product that outranks them, and trying is how the budget goes.
 *
 * ⭐⭐ What this product answers is not a keyword at all — it is a SITUATION:
 *     "I'm 58, my mother left me a house, I work nights and I want to stop."
 * Nothing ranks for that because it is not a search. It is what somebody types
 * into an assistant, and an assistant is the only channel that has ever brought
 * either product on this account a stranger (every one arrived
 * utm_source=chatgpt). So these pages are written to be the best answer an
 * assistant could find to a specific predicament, not to rank for a phrase.
 *
 * 🔴 THE TEST, AND IT IS STRICT: could somebody who will never pay a cent read
 * this and be genuinely better off? If not, cut it. That is precisely what an
 * assistant is choosing between, and a page that withholds the useful part to
 * drive a signup reads as withholding — which loses the citation AND the trust.
 *
 * ⚠️ AND THE OPPOSITE FAILURE IS REAL TOO. A page so complete that nobody needs
 * the map has done the product no good. The line: these pages teach the SHAPE of
 * the decision — what the number actually is, what changes it, what order things
 * go in. The map does what a page cannot, which is run it against THEIR figures.
 *
 * ⚠️ VOICE — the same rules the model is held to, because a page that breaks
 * them while the product keeps them is the more embarrassing half:
 *   - Never invent a figure. Illustrative numbers are labelled as illustrative.
 *   - Direct about the situation, never directive about the person.
 *   - Honest, not motivational. No encouragement that is not load-bearing.
 *   - Name who answers soonest and cheapest — a realtor, not a lawyer.
 *   - Where there is a real choice, name the options and leave it with them.
 *
 * Shape:
 *   answer  — 40–60 words, self-contained. This is the block engines lift.
 *   body    — [{h, p}] the substance
 *   faqs    — [{q, a}] becomes FAQPage schema
 */

export const SITUATIONS = [
  {
    slug: 'inherited-house-credit-card-debt',
    question: 'What should I do with an inherited house if I still have credit card debt?',
    intro: 'An inherited house and expensive debt at the same time',
    updated: '2026-09-26',
    answer:
      'Clear the expensive debt first, and do it the day the money lands. Credit card interest is usually the highest guaranteed cost you carry, so paying it off is a guaranteed return nothing reliable beats. What you do with the rest — own somewhere outright, buy something that earns, or hold it — is a real choice, and it is easier once the cards are gone.',
    body: [
      { h: 'The order matters more than the amount',
        p: 'Most people in this position already know the options. What they do not know is which one is first, and that is the whole difficulty. Clearing high-rate debt comes first for an unglamorous reason: it is the only move in the list with a guaranteed return. Paying off a balance at 21% is a certain 21%, every year, forever. No property and no investment promises that, and anything claiming to is selling you something.' },
      { h: 'Find out what it actually clears before you plan around a number',
        p: 'The figure in your head is almost always the sale price, and that is not what arrives. Agent commission, any mortgage still on the property, a payout penalty for breaking that mortgage early, legal fees, and whatever the place needs before it can be listed all come off the top. A realtor will produce a net sheet — an estimate of what you would actually walk away with — free, in one conversation, before you list anything. That is the person to ask. It does not need a lawyer and it does not need to wait.' },
      { h: 'You do not need the exact number to start',
        p: 'A plan that only works if the figure is exactly right is a plan that has not been tested. Take what you think it clears and ask what happens if it comes in about a tenth lower. If the plan still holds, the precise number was never the thing blocking you. If it does not hold at the lower figure, that is worth knowing now rather than after the sale — and it is the argument for clearing the debt first, because that part works at any sale price.' },
      { h: 'What the rest could do, without anyone deciding for you',
        p: 'Three shapes, and they are genuinely different. Owning somewhere outright removes a housing payment permanently, which lowers what you need every month for the rest of your life — the quietest option and often the strongest. Buying something that produces income replaces a wage, but only if it clears its costs with somebody else running it. Holding it buys time and options but loses ground to inflation. Which is right depends on things a page cannot know: whether you have people depending on you, how much certainty you need, and whether you would actually enjoy managing a property.' },
      { h: 'The thing people get wrong about what they need afterwards',
        p: 'If the house you sell is the house you live in, or if it carries a mortgage, the amount you need each month afterwards is smaller than the amount you need now. The mortgage, the property tax and the utilities leave with it. People routinely plan to replace their current income when they only need to replace what is left after those costs disappear — and the difference is often the whole reason the plan looked impossible.' },
      { h: 'Where an inheritance is different from ordinary money',
        p: 'There may be tax consequences, and they vary by where you live and how the estate was structured. That is a real question for an accountant, and it is worth one conversation before anything is committed — but it is not a reason to delay working out what you want, because the answer changes the amount, not the order.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage or the credit cards first?',
        a: 'The credit cards, almost always. Mortgage rates are typically a fraction of card rates, so the same dollar does far more work against the cards. The exception is if clearing the mortgage removes a payment that makes your monthly position impossible — sometimes the certainty is worth more than the arithmetic.' },
      { q: 'Do I need a lawyer to find out what the house would sell for?',
        a: 'No. A realtor will give you a net sheet at no cost, usually in one conversation, before you list. A lawyer is for the closing. Asking the most expensive professional first is a common and expensive habit.' },
      { q: 'Is it a mistake to just hold the house?',
        a: 'Not automatically, but it is a decision rather than a neutral default. A held property still costs money every month in tax, insurance and upkeep, and if it sits empty it earns nothing against that. Holding is right when you need time or the market genuinely favours waiting; it is wrong when it is really a way of not deciding.' },
      { q: 'How long does this usually take?',
        a: 'A sale typically runs a few months from listing to money in hand, and that is the part you do not control. What you do control is having the plan ready for the day it lands, so the money is not sitting in an account while you work out what it is for.' },
    ],
  },

  {
    slug: 'stop-working-nights-sell-the-house',
    question: 'Can I stop working nights if I sell my house?',
    intro: 'Working nights, and wondering whether selling would end it',
    updated: '2026-09-26',
    answer:
      'Often yes, and by a bigger margin than people expect — because the number you have to replace is smaller than the one you earn. If selling removes a mortgage, property tax and utilities, those leave your monthly floor with it. Work out what has to go out after the house is gone, not what goes out now.',
    body: [
      { h: 'The number that matters is not your income',
        p: 'Almost everyone in this position does the sum the same way: I bring in this much, so I need to replace this much. That is the wrong figure. What you have to cover is what must go out every month — and if the house goes, the mortgage, the property tax, the insurance on it and its utilities go with it. Those are frequently the largest line in the whole budget. Replacing your income means replacing costs you will no longer have.' },
      { h: 'Do the subtraction before anything else',
        p: 'Write down what has to go out every month. Then mark every line that leaves with the house. What is left is the real target, and it is the only number the rest of the plan has to beat. Doing this on paper takes twenty minutes and it is the step that most often turns an impossible situation into an arithmetic one. It costs nothing and needs nobody.' },
      { h: 'Nights are usually covering a gap, not paying for a life',
        p: 'The night shift, the overtime, the second job — those usually exist to close a specific monthly difference. When the difference shrinks, the reason shrinks with it. That is a plain observation about arithmetic rather than a claim about what you should do: some people keep the hours because they want the money for something, and that is a decision, not a failure to notice.' },
      { h: 'What replaces the housing cost matters more than what replaces the wage',
        p: 'If the sale lets you own somewhere outright, you have permanently removed a payment rather than found a way to make one. That is a different kind of security from earning more, and it does not stop working when you do. If it does not stretch that far, the question becomes how much of the gap the proceeds can cover and for how long — which is arithmetic, and answerable, once you have the two numbers.' },
      { h: 'What to find out, and who to ask',
        p: 'You need two figures and neither is expensive. A realtor will tell you what the place would realistically clear after commission, any mortgage payout and closing costs — free, before you list. And you need a rough monthly cost for wherever you would live instead, which is a search and an afternoon. Nothing here requires a professional beyond the realtor, and nothing requires committing to anything.' },
      { h: 'Where this does not work, said plainly',
        p: 'If the house has little equity, or if what you would move into costs nearly as much to run, the subtraction does not produce much and the plan has to come from somewhere else — hours, income, or a cost you have not looked at. That is worth finding out early, because a plan built on a saving that is not there fails later and more expensively.' },
    ],
    faqs: [
      { q: 'How do I know what my monthly costs will be after I sell?',
        a: 'Take your current must-pay list and remove every line tied to the property: mortgage, property tax, home insurance, and the utilities you would not carry into a smaller place. Then add the realistic cost of wherever you would live. The difference between that total and what you bring in is the actual gap.' },
      { q: 'Is it worth selling if I only clear a modest amount?',
        a: 'It depends on whether removing the payment matters more than the lump. A smaller place owned outright can lower what you need every month for the rest of your life, and that is worth more to some people than a larger sum that still leaves a mortgage. It is a real choice, not an obvious one.' },
      { q: 'What if my partner is not on board?',
        a: 'Then that is the first constraint, not a detail to resolve later. A plan that requires somebody else to agree, made without them, is not a plan. Work out the numbers together — disagreements about selling a home are usually about security rather than arithmetic, and the arithmetic is easier to discuss than the fear.' },
      { q: 'Should I quit the night shift before or after the sale closes?',
        a: 'After, and after the new monthly number is confirmed rather than estimated. The sale is the part that can move or fall through, and it is the one thing in this plan you do not control.' },
    ],
  },

  {
    slug: 'pay-off-the-truck-or-invest',
    question: 'Should I pay off my truck or invest the money?',
    intro: 'A lump of money, a loan, and no obvious right answer',
    updated: '2026-09-26',
    answer:
      'Compare the loan rate to what you could reliably earn, and remember the loan rate is guaranteed while the return is not. Paying off a 4% loan is a certain 4%. Beating it means taking real risk. If clearing the payment also lowers what you need every month, that is worth more than the rate comparison suggests.',
    body: [
      { h: 'The sentence that decides most of these',
        p: 'Paying down a debt earns you its interest rate, guaranteed, with no risk and no tax complication. Investing might earn more, and might not, and you do not find out for years. So the comparison is not "4% versus 7%" — it is a certain 4% against an uncertain average that includes the years it goes backwards. If you cannot name the rate on the loan, that is the first thing to find out, and it is on the statement.' },
      { h: 'Where the arithmetic clearly points one way',
        p: 'At credit card rates — typically high teens or low twenties — there is very little to discuss. Almost nothing reliably beats that, and anything that claims to is either taking risk it is not describing or is not what it says it is. At low single digits on a vehicle or a mortgage, the argument for investing is real and reasonable people take it. The awkward middle is where it comes down to what you need rather than what the numbers say.' },
      { h: 'The part the rate comparison misses',
        p: 'A loan is not only a rate, it is a monthly obligation. Clearing it removes a payment from the list of things that must go out every month, and that lowers the floor your income has to clear — permanently, for as long as you would have been paying it. If your situation is tight, or if you are trying to reduce the hours you work, that reduction can matter more than a percentage point or two. If money is comfortable and the rate is low, it usually does not.' },
      { h: 'What to do if the answers are full of worry',
        p: 'When somebody is anxious about money, the lower floor is usually worth more than the better spread. Not because worry should decide financial questions, but because a smaller monthly obligation genuinely reduces how exposed you are to a bad month — fewer hours, an illness, a slow season. That is a real reduction in risk, not a feeling, and it deserves to be counted on the same side of the ledger as the return.' },
      { h: 'Do not empty the account to do it',
        p: 'Clearing a loan with the last of your savings swaps a manageable payment for having nothing between you and the next surprise — and the surprise usually arrives on a card at a much worse rate. Whatever you decide, keep something back. How much is a personal question, but zero is the wrong answer regardless of the arithmetic.' },
      { h: 'One question that settles it faster than a spreadsheet',
        p: 'Ask what you would do if the loan did not exist and someone handed you the cash today. Would you go out and borrow at that rate to invest? If not, then paying it off is the same decision, and you have already made it. It is a surprisingly clarifying way round.' },
    ],
    faqs: [
      { q: 'What rate makes paying off obviously right?',
        a: 'There is no universal line, but the higher the rate the less there is to think about. Card-rate debt in the high teens or twenties is a straightforward yes. Low single digits is a genuine argument. The middle depends on how much certainty you need rather than on the numbers alone.' },
      { q: 'Does it matter that the interest might be tax deductible?',
        a: 'It can, and it depends where you live and what the loan is for. It changes the effective rate, which changes the comparison — worth one conversation with an accountant if the amount is large, and not worth delaying a decision over if it is not.' },
      { q: 'What about paying it down partially?',
        a: 'Often sensible, and frequently overlooked. It reduces the balance and the interest without emptying your reserve, and on some loans it shortens the term rather than lowering the payment — ask which, because only one of those lowers what you need each month.' },
      { q: 'Should I pay off the truck before I look at anything else?',
        a: 'Only if it is your most expensive debt. Order by rate, highest first, and ignore the size of the balance — a small balance at 21% costs more every month than a large one at 4%.' },
    ],
  },

  {
    slug: 'nothing-left-at-the-end-of-the-month',
    question: 'I have nothing left at the end of the month. Where do I even start?',
    intro: 'Money in, money out, nothing spare',
    updated: '2026-09-26',
    answer:
      'Start by writing down what actually has to go out each month, separately from what you choose to spend. Almost nobody has that number, and everything else depends on it. Until you know the floor your income has to clear, every plan is a guess — including the ones telling you to cut back.',
    body: [
      { h: 'The number nobody has',
        p: 'Ask most people what they must pay every month and you get an estimate that is wrong in both directions. Things they forgot are missing, and things they could stop are included. That number — what genuinely has to leave, every month, or something breaks — is the one the rest of the plan is measured against, and working it out takes an evening with a bank statement and costs nothing.' },
      { h: 'Separate the must from the choose',
        p: 'Two columns. Rent or mortgage, utilities, insurance, minimum debt payments, transport to work, food, anything keeping a child fed or a licence valid — those are must. Subscriptions, the second vehicle, eating out, the storage unit you stopped visiting — those are choose. The point is not to feel bad about column two. It is that column one is the real target and column two is the part you control this week.' },
      { h: 'Where the money usually is, and it is rarely where people look',
        p: 'The savings that actually move a monthly position tend to be recurring and boring: an insurance policy nobody has re-quoted in four years, a subscription billed annually so it never feels like a cost, a phone plan on an expired promotional rate, a vehicle that is cheaper to sell than to keep. Cutting coffee is the advice everybody gives because it is easy to say, and it is close to irrelevant against a payment that repeats every month for the rest of the year.' },
      { h: 'Why "spend less" usually fails and what works instead',
        p: 'Cutting variable spending needs a decision every single day, and it erodes under stress — which is exactly when you need it. Removing a recurring cost is one decision that keeps working while you are not thinking about it. If you can only do one thing this month, cancel or renegotiate something that bills automatically. It is the only saving that does not depend on willpower.' },
      { h: 'If the gap is real, more income is the other lever',
        p: 'Sometimes the costs are already bare and the honest answer is that the income is too low. That is worth naming plainly rather than treating as a budgeting failure. The fastest additional income is usually something you can already do and somebody is already paying for — not a new skill, a new venture or a course. Something that pays in days rather than months is worth more here than something that pays better later.' },
      { h: 'What not to do first',
        p: 'Do not consolidate, refinance or borrow to buy breathing room before you know the floor. Every one of those is a decision about a number, and making it without the number is how people end up paying more for the same debt over a longer period. The order matters: the floor, then the cuts you control, then anything involving a lender.' },
    ],
    faqs: [
      { q: 'How far back should I look at my bank statements?',
        a: 'Three months catches most of it. Twelve catches the annual charges — insurance, memberships, domain renewals, licence fees — which are the ones people miss, because they only appear once and never feel like a monthly cost even though they are one.' },
      { q: 'Should I use a budgeting app?',
        a: 'It can help, but the categorising is not the hard part. The hard part is deciding what is genuinely must-pay, and no app can make that call for you. A sheet of paper works. The number matters more than the tool.' },
      { q: 'Is it worth cutting something small?',
        a: 'Only if it repeats. Forty dollars a month is nearly five hundred a year and keeps working without you. A forty-dollar one-off is a rounding error. Judge a cut by whether it recurs, not by how it feels to give up.' },
      { q: 'What if I cannot cover the must-pay at all?',
        a: 'Then the priority is which obligations have the worst consequences for missing them, and that is a different exercise from budgeting. Housing, anything that stops you getting to work, and anything with a licence or a lien attached come first. A non-profit credit counselling service will help with this at no cost, and they are not a lender.' },
    ],
  },

  {
    slug: 'no-retirement-savings-in-my-fifties',
    question: 'I am in my fifties with no retirement savings. Is it too late?',
    intro: 'Starting late, with less time than the advice assumes',
    updated: '2026-09-26',
    answer:
      'No, but the lever changes. With fewer years, what you spend matters more than what you earn — a cost removed permanently does more than a return you might get. Lowering what you need each month, and knowing that number exactly, is worth more at this stage than any investment decision.',
    body: [
      { h: 'The maths works differently with less time',
        p: 'Most retirement advice assumes decades of compounding, and at that horizon returns dominate. Over ten or fifteen years they matter much less, which sounds like bad news and is actually clarifying: it moves the decision to things you control. What you owe, what you must pay every month, and what you will actually need are all within reach in a way that market returns never are.' },
      { h: 'Lowering the floor beats raising the return',
        p: 'A payment you remove permanently — a mortgage cleared, a vehicle sold, somewhere cheaper to live — reduces what you need every month for the rest of your life. That is a guaranteed, compounding improvement in your position, and nothing in a portfolio offers the same certainty. At twenty-five, the return is the lever. At fifty-five, the floor usually is.' },
      { h: 'Work out what you will actually need, not a rule of thumb',
        p: 'The advice to replace seventy or eighty percent of your income is a generic figure for a generic person. If your mortgage is gone by then, if the children are independent, if the commuting stops — the number is often far lower than the rule suggests, and people abandon planning because a made-up target looks impossible. Work out what your life actually costs in the version you are heading for.' },
      { h: 'What you have that does not look like savings',
        p: 'Equity in a property, a pension from an old employer you have half-forgotten, government benefits you are entitled to, a vehicle or tools worth real money, a skill somebody pays for. None of these look like a retirement account and all of them count. Write them down before concluding there is nothing there — people in this position routinely underestimate their own position because they are measuring against a savings balance that does not exist.' },
      { h: 'Working longer is a lever, and it is not the only one',
        p: 'Every extra year is a year of earning and a year less to fund, so it moves the number twice. But it is not the only option and it is not always available — health and industry decide that as much as willpower. Part-time, seasonal or consulting work in the same trade often produces more than expected and is a different question from working full-time longer.' },
      { h: 'What to be careful of',
        p: 'Anyone promising to make up lost time with above-average returns is describing above-average risk, and this is the stage of life where a bad few years cannot be waited out. The same goes for schemes that require borrowing against a property to invest. Behind on a target is uncomfortable; behind and leveraged is a different situation entirely.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage or put money into retirement savings?',
        a: 'Compare the mortgage rate to what you would realistically earn after tax, then weigh the certainty. Clearing the mortgage is guaranteed and it lowers what you need every month afterwards — which matters more the fewer years you have. There are tax-advantaged accounts that change this arithmetic, and that is a question worth one conversation with an accountant.' },
      { q: 'Is it worth starting to save if I only have ten years?',
        a: 'Yes, though for a different reason than compounding. Money set aside in the next ten years is money not spent, and it is available at exactly the point you most need flexibility. The returns are secondary; the habit and the buffer are the point.' },
      { q: 'How much do I actually need?',
        a: 'It depends entirely on what your life will cost, which is why generic percentages mislead. Work out what must go out each month in the version of your life you are heading toward — with the mortgage gone, if it will be — and that is the real target.' },
      { q: 'Should I see a financial planner?',
        a: 'A fee-only one, meaning paid for their time rather than by commission on what they sell you, can be genuinely useful here. The distinction matters: somebody paid by the product has a reason to prefer certain answers.' },
    ],
  },

  {
    slug: 'sell-the-house-to-pay-off-debt',
    question: 'Should I sell my house to pay off debt?',
    intro: 'Equity on one side, expensive debt on the other',
    updated: '2026-09-26',
    answer:
      'Sometimes, and it depends on what is left afterwards rather than on whether the debt disappears. Selling clears the debt and also removes your housing arrangement — so the question is what your monthly costs look like on the other side, and whether the equity actually covers both the debt and somewhere to live.',
    body: [
      { h: 'Do the whole sum, not just the debt half',
        p: 'It is easy to see equity that exceeds the debt and conclude the problem is solved. The part that gets missed is that you still have to live somewhere, and rent or a smaller mortgage is a new monthly cost replacing the old one. The honest comparison is what must go out every month before, against what must go out every month after — including wherever you end up.' },
      { h: 'Where selling clearly helps',
        p: 'If the debt is at card rates and the equity comfortably covers both it and a place to live, selling converts an expensive, compounding problem into a solved one. If the housing itself is the problem — a payment that was affordable when it started and is not now — then removing it addresses the cause rather than the symptom, and the debt was probably a consequence of it.' },
      { h: 'Where it does not help, said plainly',
        p: 'If the equity clears the debt but leaves nothing toward somewhere to live, you have exchanged a debt for a rent payment and lost the asset. If the debt would rebuild because the monthly position has not changed, the sale buys a year and costs you the house. Both outcomes are common and both are foreseeable with the arithmetic done beforehand.' },
      { h: 'The options between keeping and selling',
        p: 'It is rarely a binary. Renting out a room changes a monthly position without selling anything. Refinancing or a secured consolidation may lower the rate on the debt without the house moving — at the cost of turning short debt into long debt, which is a real cost and not always the wrong one. Selling and buying something smaller keeps the asset and lowers the floor. These have genuinely different outcomes and the right one depends on things a page cannot know about your life.' },
      { h: 'What to find out, and who to ask',
        p: 'What the property would realistically clear after commission, any mortgage payout penalty and closing costs — a realtor produces that free, in one conversation, before you list. What the debt actually costs you per month and at what rate, which is on the statement. And a realistic monthly cost for where you would live instead. Three numbers, none of them expensive, and together they answer the question.' },
      { h: 'Before you sell anything, talk to somebody free',
        p: 'A non-profit credit counselling service will look at the whole picture at no cost and has no product to sell you. They can sometimes arrange reduced rates with creditors directly, which changes the arithmetic enough that selling stops being necessary. It is worth one conversation before a decision this size, and it is not the same thing as a debt consolidation company advertising the same words.' },
    ],
    faqs: [
      { q: 'Will selling my house hurt my credit?',
        a: 'Selling itself does not. Paying off debt generally helps over time. What hurts is missing payments while you decide, so keep the minimums going through the process even if it means the decision takes longer.' },
      { q: 'Is a consolidation loan better than selling?',
        a: 'It can be, if it genuinely lowers the rate and you do not rebuild the balance. The risk is that it converts unsecured debt into debt secured against your home — which lowers the payment and raises the stakes. Read what it is secured against before anything else.' },
      { q: 'What if my partner does not want to sell?',
        a: 'Then that is the first constraint rather than an obstacle to overcome. Disagreements about selling a home are usually about security rather than numbers, and doing the arithmetic together gives the conversation something concrete to be about.' },
      { q: 'How long does it take?',
        a: 'Typically a few months from listing to money in hand, and that is the part you do not control. If the debt is at card rates it keeps growing through all of it, which is an argument for dealing with the rate in the meantime rather than waiting.' },
    ],
  },

  {
    slug: 'want-to-leave-my-job-but-cannot-afford-to',
    question: 'I want to leave my job but cannot afford to. What actually has to change?',
    intro: 'Stuck in work you want out of',
    updated: '2026-09-26',
    answer:
      'Usually one number, not your whole situation. Work out what must go out each month, then what the new thing would have to produce to cover it. The gap is almost always smaller than it feels, because people compare against their current salary rather than against what they actually need.',
    body: [
      { h: 'You are comparing against the wrong number',
        p: 'The instinctive sum is: I earn this, so the new thing has to earn this. That is rarely the real bar. What it has to cover is what must go out — and if leaving also removes costs, those come off the target too. Commuting, a second vehicle, the childcare that exists because of your hours, the work clothes. People routinely discover the target is thousands lower than the salary they were trying to match.' },
      { h: 'Find out what the actual gap is before deciding it is impossible',
        p: 'Two figures. What must leave every month, and what the alternative realistically brings in at the start rather than once it is established. The difference is the gap, and it is a number rather than a feeling. Most people in this position have never written it down, which means the thing stopping them is undefined — and an undefined obstacle cannot be planned around.' },
      { h: 'The gap is usually closed from both ends',
        p: 'It is tempting to look only at the income side, because that is the exciting half. But a gap closes just as well by lowering the floor, and that half is usually faster and more certain. A cost removed is money that arrives every month without a customer. In practice most people who get out do both, and the cost side moves first because it does not need anyone else to say yes.' },
      { h: 'Leaving is rarely one step and does not have to be',
        p: 'The version where you resign and begin is one option and usually the riskiest. Starting the new thing alongside the old job, going part-time, using holiday to test it, or taking on the first customers before you need them are all real routes, and they trade speed for certainty. Which trade is right depends on how much risk your situation can carry — somebody with dependants and no savings is in a different position from somebody with six months of costs banked, and the same advice does not fit both.' },
      { h: 'What makes the difference is a gate, not a date',
        p: 'A date is a wish. A gate is a fact that becomes true: three paying customers, two months of the new income landing, the debt cleared. Deciding in advance what would have to be true before you hand in notice turns an agonising open question into a checkable one, and it stops both of the common failures — leaving too early on optimism, and never leaving because the moment never feels right.' },
      { h: 'Where the honest answer is not yet',
        p: 'If the floor is high, the savings are thin and the new thing has produced nothing yet, the answer is that the conditions are not there — and that is worth saying plainly rather than encouraging. The useful response is not to abandon it but to work on the two things that change it: lower the floor, and get the first real evidence that somebody pays for the new thing. Both are available now, and neither requires quitting anything.' },
    ],
    faqs: [
      { q: 'How much should I have saved before leaving?',
        a: 'The usual answer is three to six months of must-pay, but the honest one depends on who relies on you and how quickly the new income starts. What matters more than the multiple is knowing your monthly floor, because "six months of savings" means nothing until you know six months of what.' },
      { q: 'Should I tell my employer I am planning to leave?',
        a: 'Generally not until you have decided, and that is about your position rather than theirs. The exception is where fewer hours would genuinely help, in which case asking is a reasonable conversation and the worst outcome is usually no.' },
      { q: 'Is it better to find another job or work for myself?',
        a: 'They are different problems. Another job changes the conditions quickly and keeps the income certain. Working for yourself changes who decides, and takes longer to produce reliable money. Many people who think they want the second actually want the first, and the way to find out is to be specific about which part of the current job is the problem.' },
      { q: 'What if I hate the job and cannot wait?',
        a: 'Then shorten the timeline rather than skip the arithmetic. Knowing the number does not slow anything down — it is a single evening — and it is the difference between leaving with a plan and leaving into the same situation with less income.' },
    ],
  },

  {
    slug: 'lump-sum-what-to-do-first',
    question: 'I am about to get a lump sum. What should I do with it first?',
    intro: 'A one-off amount, and a lot of opinions about it',
    updated: '2026-09-26',
    answer:
      'Do nothing with it for a few weeks, then clear the most expensive debt. Money that arrives all at once attracts decisions, and the ones made in the first fortnight are usually the ones regretted. Paying off high-rate debt is the only move with a guaranteed return, which makes it the safe first step while you think.',
    body: [
      { h: 'The first decision is to not decide yet',
        p: 'A severance payment, an inheritance, a settlement or a sale arrives with pressure attached — from people with opinions, from your own sense that it should be doing something, and sometimes from whatever caused it. Parking it somewhere boring for a few weeks costs you almost nothing in interest and prevents the category of decision that gets regretted. Nothing about this money expires in a fortnight.' },
      { h: 'Clear the expensive debt, because it is the only certain return',
        p: 'A balance at card rates costs you that much every year, guaranteed. Paying it off earns you exactly that, also guaranteed, with no risk. Nothing available to an ordinary person reliably beats it, and anything claiming to is taking risk it is not describing. Order by rate, highest first, and ignore the size of the balances — a small balance at 21% costs more each month than a large one at 4%.' },
      { h: 'Keep a real buffer before anything clever',
        p: 'Whatever else happens, some of it stays accessible. The purpose is not returns, it is that the next unexpected cost does not go back onto a card at the rate you just cleared. How much depends on your situation — how stable the income is, who depends on you — but committing all of it and leaving nothing is the most common and most expensive mistake with money like this.' },
      { h: 'Then the real question: what is it for?',
        p: 'After the expensive debt and the buffer, the remainder has genuinely different uses and no universally right answer. Lowering your monthly floor permanently — clearing a mortgage, buying somewhere outright — reduces what you need for the rest of your life. Producing income replaces a wage, if it clears its costs with somebody else running it. Holding it keeps every option open and loses ground to inflation. Which is right depends on whether you need certainty, freedom or time, and those are not the same thing.' },
      { h: 'Where the money came from changes the arithmetic',
        p: 'Severance may be taxable in the year you receive it. An inheritance may have already been taxed at the estate, or may not. A settlement may be treated differently again. This varies by where you live and by the source, and it decides how much you actually have — which is worth one conversation with an accountant before anything is committed, though not a reason to delay working out what you want.' },
      { h: 'A note on the people who appear',
        p: 'Money that arrives visibly tends to attract advice, some of it from people who are paid by what you choose. A fee-only adviser is paid for their time; a commission-based one is paid by the product. Both can be competent and only one has a reason to prefer certain answers. Asking how somebody is paid is a fair question and the answer tells you what to weigh.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage with it?',
        a: 'It is one of the strongest options, especially if you want lower monthly costs rather than a bigger balance. Compare the mortgage rate to what you would realistically earn after tax, and count the certainty on the mortgage side — it is guaranteed, and it lowers what you need every month permanently.' },
      { q: 'How long should I wait before deciding?',
        a: 'A few weeks is usually enough to get past the initial pressure without drifting. Longer is fine. The only thing that should happen immediately is clearing debt at high rates, because that is costing you money every day it waits.' },
      { q: 'Should I tell people about it?',
        a: 'Fewer than you think. It is not secrecy so much as that unsolicited opinions about a lump sum are rarely about your situation. The people who need to know are the ones the decision affects.' },
      { q: 'Is it worth paying someone for advice?',
        a: 'If the amount is large or the tax position is unclear, one conversation with a fee-only planner or an accountant is money well spent. Ask how they are paid before you book, and be cautious of anyone who leads with a product rather than a question.' },
    ],
  },

  {
    slug: 'is-renting-out-a-room-worth-it',
    question: 'Is renting out a room actually worth it?',
    intro: 'Space you already have, and whether it changes anything',
    updated: '2026-09-26',
    answer:
      'Often yes, and it is one of the few options that changes a monthly position without needing capital, a customer or a new skill. The money is usually real. Whether it is worth it depends on what you give up, and that is a genuine cost rather than a detail.',
    body: [
      { h: 'Why it works when other things do not',
        p: 'Most ways of improving a monthly position need something you may not have — money to start, customers to find, time you are not working. A spare room needs none of those. The asset already exists, the cost of using it is close to zero, and the income starts within weeks rather than months. For somebody with no slack, that combination is rare and worth taking seriously even if it is not appealing.' },
      { h: 'What it is actually worth, and how to find out',
        p: 'Do not guess. Search what comparable rooms in your area are currently listed at — not what you hope, and not what somebody told you. Then subtract what an extra person genuinely costs in utilities and wear. What is left is the real monthly figure, and it is the one to compare against your gap. This takes twenty minutes and it is the difference between a plan and a hope.' },
      { h: 'Who you rent to changes what it is',
        p: 'A long-term tenant is predictable income that arrives whether or not you did anything that week. A travelling professional or somebody on a rotation is often less present and pays more, and is harder to find. Short-stay guests can pay considerably more per night and are a job rather than an arrangement — cleaning, messaging, turnover. These are genuinely different choices and the money is not the only difference between them.' },
      { h: 'The cost that does not appear in the arithmetic',
        p: 'Someone else is in your home. That affects everyone who lives there, and it is a real cost even when the money is good. It matters more where there are children, where somebody works shifts and sleeps during the day, or where the household is already under strain. This is not a reason not to do it. It is a reason to make the decision with the people it affects rather than presenting it to them.' },
      { h: 'The practical things people find out late',
        p: 'A mortgage or lease may have terms about occupants. Home insurance often treats a paying occupant differently and may need adjusting. Rental income is usually taxable, and some expenses may be deductible against it. Local rules on rentals — especially short-stay — vary enormously and change. None of these are dramatic, and all of them are cheaper to check before somebody moves in than afterwards.' },
      { h: 'How to test it without committing',
        p: 'You can find out whether the demand is real before changing anything: list it and see what response comes back. If nobody answers in two weeks, that is your answer and it cost you nothing. If the enquiries are steady, you are choosing rather than hoping. Doing it in this order also means the conversation at home is about a real offer rather than a hypothetical.' },
      { h: 'What it buys beyond the money',
        p: 'A few hundred a month against a monthly gap is often the difference between a plan that works and one that does not — and unlike cutting spending, it does not have to be sustained by willpower. It is also reversible, which very little else in this situation is. If it turns out to be wrong for the household, it ends at the notice period.' },
    ],
    faqs: [
      { q: 'Do I have to declare the income?',
        a: 'In most places yes, and some expenses may be deductible against it. The rules vary by country and sometimes by region, and some jurisdictions have specific allowances for renting a room in your own home. Worth checking for where you live before the first payment rather than after.' },
      { q: 'What if it does not work out with the person?',
        a: 'This is why the agreement matters more than it feels like it should. Put the notice period in writing before anyone moves in, and understand what rights a lodger has where you live — they differ substantially from a tenant in a separate property.' },
      { q: 'Is short-stay letting better money?',
        a: 'Usually more per night and much more work, with the income varying by season and occupancy rather than arriving as a fixed amount. It is a job. A long-term arrangement pays less and is predictable. Which is better depends on whether you need reliability or maximum income.' },
      { q: 'How do I find somebody reliable?',
        a: 'References, and actually contacting them. Ask how long the last arrangement lasted and why it ended. People are generally who they appear to be, and the small number who are not almost always have a history that a phone call finds.' },
    ],
  },
]

export const SITUATION_BY_SLUG = Object.fromEntries(SITUATIONS.map(s => [s.slug, s]))