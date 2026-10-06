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
 * this and be better off? If not, cut it. That is precisely what an
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
    updated: '2026-09-27',
    answer:
      'The house feels like the decision. It isn’t. Clearing the cards is the only move here with a guaranteed return. Everything else is a bet, and you can’t judge a bet while you’re paying twenty-odd percent to think about it. Do that the day the money lands. Then take as long as you want on the rest.',
    body: [
      { h: 'The order matters more than the amount',
        p: 'Most people in this position already know the options. What they don’t know is which one is first, and that’s the whole difficulty. Clearing high-rate debt comes first for an unglamorous reason: it’s the only move in the list with a guaranteed return. Paying off a balance at 21% is a certain 21%, every year, forever. No property and no investment promises that, and anything claiming to is selling you something.' },
      { h: 'Find out what it actually clears before you plan around a number',
        p: 'The figure in your head is usually the sale price, and that isn’t what arrives. Agent commission, any mortgage still on the property, a payout penalty for breaking that mortgage early, legal fees, and whatever the place needs before it can be listed all come off the top. A realtor will produce a net sheet, an estimate of what you would actually walk away with, free, in one conversation, before you list anything. That’s the person to ask. It doesn’t need a lawyer and it doesn’t need to wait.' },
      { h: 'You don’t need the exact number to start',
        p: 'A plan that only works if the figure is exactly right is a plan that hasn’t been tested. Take what you think it clears and ask what happens if it comes in about a tenth lower. If the plan still holds, the precise number was never the thing blocking you. If it doesn’t hold at the lower figure, that’s worth knowing now rather than after the sale, and it’s the argument for clearing the debt first, because that part works at any sale price.' },
      { h: 'What the rest could do, without anyone deciding for you',
        p: 'Three shapes, and they’re different. Owning somewhere outright removes a housing payment permanently, which lowers what you need every month for the rest of your life, the quietest option and often the strongest. Buying something that produces income replaces a wage, but only if it clears its costs with somebody else running it. Holding it buys time and options but loses ground to inflation. Which is right depends on things a page can’t know: whether you have people depending on you, how much certainty you need, and whether you would actually enjoy managing a property.' },
      { h: 'The thing people get wrong about what they need afterwards',
        p: 'If the house you sell is the house you live in, or if it carries a mortgage, the amount you need each month afterwards is smaller than the amount you need now. The mortgage, the property tax and the utilities leave with it. People routinely plan to replace their current income when they only need to replace what’s left after those costs disappear, and the difference is often the whole reason the plan looked impossible.' },
      { h: 'Where an inheritance is different from ordinary money',
        p: 'There may be tax consequences, and they vary by where you live and how the estate was structured. That’s a real question for an accountant, and it’s worth one conversation before anything is committed, but it isn’t a reason to delay working out what you want, because the answer changes the amount, not the order.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage or the credit cards first?',
        a: 'The credit cards, usually. Mortgage rates are typically a fraction of card rates, so the same dollar does far more work against the cards. The exception is if clearing the mortgage removes a payment that makes your monthly position impossible. Sometimes the certainty is worth more than the arithmetic.' },
      { q: 'Do I need a lawyer to find out what the house would sell for?',
        a: 'No. A realtor will give you a net sheet at no cost, usually in one conversation, before you list. A lawyer is for the closing. Asking the most expensive professional first is a common and expensive habit.' },
      { q: 'Is it a mistake to just hold the house?',
        a: 'Not automatically, but it’s a decision rather than a neutral default. A held property still costs money every month in tax, insurance and upkeep, and if it sits empty it earns nothing against that. Holding is right when you need time or the market favours waiting; it’s wrong when it’s really a way of not deciding.' },
      { q: 'How long does this usually take?',
        a: 'A sale typically runs a few months from listing to money in hand, and that’s the part you don’t control. What you do control is having the plan ready for the day it lands, so the money isn’t sitting in an account while you work out what it is for.' },
    ],
  },

  {
    slug: 'stop-working-nights-sell-the-house',
    question: 'Can I stop working nights if I sell my house?',
    intro: 'Working nights, and wondering whether selling would end it',
    updated: '2026-09-27',
    answer:
      'Often yes, and by a bigger margin than people expect, because the number you have to replace is smaller than the one you earn. If selling removes a mortgage, property tax and utilities, those leave your monthly floor with it. Work out what has to go out after the house is gone, not what goes out now.',
    body: [
      { h: 'The number that matters isn’t your income',
        p: 'Almost everyone in this position does the sum the same way: I bring in this much, so I need to replace this much. That’s the wrong figure. What you have to cover is what must go out every month, and if the house goes, the mortgage, the property tax, the insurance on it and its utilities go with it. Those are frequently the largest line in the whole budget. Replacing your income means replacing costs you will no longer have.' },
      { h: 'Do the subtraction before anything else',
        p: 'Write down what has to go out every month. Then mark every line that leaves with the house. What’s left is the real target, and it’s the only number the rest of the plan has to beat. Doing this on paper takes twenty minutes and it’s the step that most often turns an impossible situation into an arithmetic one. It costs nothing and needs nobody.' },
      { h: 'Nights are usually covering a gap, not paying for a life',
        p: 'The night shift, the overtime, the second job. Those usually exist to close a specific monthly difference. When the difference shrinks, the reason shrinks with it. That’s a plain observation about arithmetic rather than a claim about what you should do: some people keep the hours because they want the money for something, and that’s a decision, not a failure to notice.' },
      { h: 'What replaces the housing cost matters more than what replaces the wage',
        p: 'If the sale lets you own somewhere outright, you have permanently removed a payment rather than found a way to make one. That’s a different kind of security from earning more, and it doesn’t stop working when you do. If it doesn’t stretch that far, the question becomes how much of the gap the proceeds can cover and for how long, which is arithmetic, and answerable, once you have the two numbers.' },
      { h: 'What to find out, and who to ask',
        p: 'You need two figures and neither is expensive. A realtor will tell you what the place would realistically clear after commission, any mortgage payout and closing costs, free, before you list. And you need a rough monthly cost for wherever you would live instead, which is a search and an afternoon. Nothing here requires a professional beyond the realtor, and nothing requires committing to anything.' },
      { h: 'Where this doesn’t work, said plainly',
        p: 'If the house has little equity, or if what you would move into costs nearly as much to run, the subtraction doesn’t produce much and the plan has to come from somewhere else: hours, income, or a cost you haven’t looked at. That’s worth finding out early, because a plan built on a saving that isn’t there fails later and more expensively.' },
    ],
    faqs: [
      { q: 'How do I know what my monthly costs will be after I sell?',
        a: 'Take your list of what has to be paid every month and remove every line tied to the property: mortgage, property tax, home insurance, and the utilities you wouldn’t carry into a smaller place. Then add the realistic cost of wherever you would live. The difference between that total and what you bring in is the actual gap.' },
      { q: 'Is it worth selling if I only clear a modest amount?',
        a: 'It depends on whether removing the payment matters more than the lump. A smaller place owned outright can lower what you need every month for the rest of your life, and that’s worth more to some people than a larger sum that still leaves a mortgage. It’s a real choice, not an obvious one.' },
      { q: 'What if my partner isn’t on board?',
        a: 'Then that’s the first constraint, not a detail to resolve later. A plan that requires somebody else to agree, made without them, isn’t a plan. Work out the numbers together: disagreements about selling a home are usually about security rather than arithmetic, and the arithmetic is easier to discuss than the fear.' },
      { q: 'Should I quit the night shift before or after the sale closes?',
        a: 'After, and after the new monthly number is confirmed rather than estimated. The sale is the part that can move or fall through, and it’s the one thing in this plan you don’t control.' },
    ],
  },

  {
    slug: 'pay-off-the-truck-or-invest',
    question: 'Should I pay off my truck or invest the money?',
    intro: 'A lump of money, a loan, and no obvious right answer',
    updated: '2026-09-27',
    answer:
      'Most people compare the two rates and stop there. The bigger question is what killing the payment does to your floor: because a payment gone is a permanent cut to what you have to earn every month, and that outlives any return. Paying off a 4% loan is a certain 4%. Beating it means taking real risk.',
    body: [
      { h: 'The sentence that decides most of these',
        p: 'Paying down a debt earns you its interest rate, guaranteed, with no risk and no tax complication. Investing might earn more, and might not, and you don’t find out for years. So the comparison isn’t "4% versus 7%". It’s a certain 4% against an uncertain average that includes the years it goes backwards. If you can’t name the rate on the loan, that’s the first thing to find out, and it’s on the statement.' },
      { h: 'Where the arithmetic clearly points one way',
        p: 'At credit card rates, typically high teens or low twenties, there’s very little to discuss. Almost nothing reliably beats that, and anything that claims to is either taking risk it isn’t describing or isn’t what it says it is. At low single digits on a vehicle or a mortgage, the argument for investing is real and reasonable people take it. The awkward middle is where it comes down to what you need rather than what the numbers say.' },
      { h: 'The part the rate comparison misses',
        p: 'A loan isn’t only a rate, it’s a monthly obligation. Clearing it removes a payment from the list of things that must go out every month, and that lowers the floor your income has to clear. Permanently, for as long as you would have been paying it. If your situation is tight, or if you’re trying to reduce the hours you work, that reduction can matter more than a percentage point or two. If money is comfortable and the rate is low, it usually doesn’t.' },
      { h: 'What to do if the answers are full of worry',
        p: 'When somebody is anxious about money, the lower floor is usually worth more than the better spread. Not because worry should decide financial questions, but because a smaller monthly obligation reduces how exposed you are to a bad month: fewer hours, an illness, a slow season. That’s a real reduction in risk, not a feeling, and it deserves to be counted on the same side of the ledger as the return.' },
      { h: 'Don’t empty the account to do it',
        p: 'Clearing a loan with the last of your savings swaps a manageable payment for having nothing between you and the next surprise, and the surprise usually arrives on a card at a much worse rate. Whatever you decide, keep something back. How much is a personal question, but zero is the wrong answer regardless of the arithmetic.' },
      { h: 'One question that settles it faster than a spreadsheet',
        p: 'Ask what you would do if the loan didn’t exist and someone handed you the cash today. Would you go out and borrow at that rate to invest? If not, then paying it off is the same decision, and you have already made it. It’s a surprisingly clarifying way round.' },
    ],
    faqs: [
      { q: 'What rate makes paying off obviously right?',
        a: 'There’s no universal line, but the higher the rate the less there’s to think about. Card-rate debt in the high teens or twenties is a straightforward yes. Low single digits is a genuine argument. The middle depends on how much certainty you need rather than on the numbers alone.' },
      { q: 'Does it matter that the interest might be tax deductible?',
        a: 'It can, and it depends where you live and what the loan is for. It changes the effective rate, which changes the comparison: worth one conversation with an accountant if the amount is large, and not worth delaying a decision over if it isn’t.' },
      { q: 'What about paying it down partially?',
        a: 'Often sensible, and frequently overlooked. It reduces the balance and the interest without emptying your reserve, and on some loans it shortens the term rather than lowering the payment. Ask which, because only one of those lowers what you need each month.' },
      { q: 'Should I pay off the truck before I look at anything else?',
        a: 'Only if it’s your most expensive debt. Order by rate, highest first, and ignore the size of the balance. A small balance at 21% costs more every month than a large one at 4%.' },
    ],
  },

  {
    slug: 'nothing-left-at-the-end-of-the-month',
    question: 'I have nothing left at the end of the month. Where do I even start?',
    intro: 'Money in, money out, nothing spare',
    updated: '2026-09-27',
    answer:
      'You probably don’t have a spending problem. You have a number nobody has ever made you work out: what actually has to go out each month, separate from what you choose to spend. Almost nobody knows theirs. Until you do, every plan is a guess, including the ones telling you to cut back.',
    body: [
      { h: 'The number nobody has',
        p: 'Ask most people what they must pay every month and you get an estimate that’s wrong in both directions. Things they forgot are missing, and things they could stop are included. That number, what has to leave, every month, or something breaks, is the one the rest of the plan is measured against, and working it out takes an evening with a bank statement and costs nothing.' },
      { h: 'Separate the must from the choose',
        p: 'Two columns. Rent or mortgage, utilities, insurance, minimum debt payments, transport to work, food, anything keeping a child fed or a licence valid. Those are must. Subscriptions, the second vehicle, eating out, the storage unit you stopped visiting. Those are choose. The point isn’t to feel bad about column two. It’s that column one is the real target and column two is the part you control this week.' },
      { h: 'Where the money usually is, and it’s rarely where people look',
        p: 'The savings that actually move a monthly position tend to be recurring and boring: an insurance policy nobody has re-quoted in four years, a subscription billed annually so it never feels like a cost, a phone plan on an expired promotional rate, a vehicle that’s cheaper to sell than to keep. Cutting coffee is the advice everybody gives because it’s easy to say, and it’s close to irrelevant against a payment that repeats every month for the rest of the year.' },
      { h: 'Why "spend less" usually fails and what works instead',
        p: 'Cutting variable spending needs a decision every single day, and it erodes under stress, which is exactly when you need it. Removing a recurring cost is one decision that keeps working while you’re not thinking about it. If you can only do one thing this month, cancel or renegotiate something that bills automatically. It’s the only saving that doesn’t depend on willpower.' },
      { h: 'If the gap is real, more income is the other lever',
        p: 'Sometimes the costs are already bare and the honest answer is that the income is too low. That’s worth naming plainly rather than treating as a budgeting failure. The fastest additional income is usually something you can already do and somebody is already paying for. Not a new skill, a new venture or a course. Something that pays in days rather than months is worth more here than something that pays better later.' },
      { h: 'What not to do first',
        p: 'Don’t consolidate, refinance or borrow to buy breathing room before you know the floor. Every one of those is a decision about a number, and making it without the number is how people end up paying more for the same debt over a longer period. The order matters: the floor, then the cuts you control, then anything involving a lender.' },
    ],
    faqs: [
      { q: 'How far back should I look at my bank statements?',
        a: 'Three months catches most of it. Twelve catches the annual charges, insurance, memberships, domain renewals, licence fees, which are the ones people miss, because they only appear once and never feel like a monthly cost even though they are one.' },
      { q: 'Should I use a budgeting app?',
        a: 'It can help, but the categorising isn’t the hard part. The hard part is deciding what truly has to be paid, and no app can make that call for you. A sheet of paper works. The number matters more than the tool.' },
      { q: 'Is it worth cutting something small?',
        a: 'Only if it repeats. Forty dollars a month is nearly five hundred a year and keeps working without you. A forty-dollar one-off is a rounding error. Judge a cut by whether it recurs, not by how it feels to give up.' },
      { q: 'What if I can’t cover what has to be paid at all?',
        a: 'Then the priority is which obligations have the worst consequences for missing them, and that’s a different exercise from budgeting. Housing, anything that stops you getting to work, and anything with a licence or a lien attached come first. A non-profit credit counselling service will help with this at no cost, and they’re not a lender.' },
    ],
  },

  {
    slug: 'no-retirement-savings-in-my-fifties',
    question: 'I am in my fifties with no retirement savings. Is it too late?',
    intro: 'Starting late, with less time than the advice assumes',
    updated: '2026-09-27',
    answer:
      'No, but the lever changes. With fewer years, what you spend matters more than what you earn. A cost removed permanently does more than a return you might get. Lowering what you need each month, and knowing that number exactly, is worth more at this stage than any investment decision.',
    body: [
      { h: 'The maths works differently with less time',
        p: 'Most retirement advice assumes decades of compounding, and at that horizon returns dominate. Over ten or fifteen years they matter much less, which sounds like bad news and is actually clarifying: it moves the decision to things you control. What you owe, what you must pay every month, and what you will actually need are all within reach in a way that market returns never are.' },
      { h: 'Lowering the floor beats raising the return',
        p: 'A payment you remove permanently, a mortgage cleared, a vehicle sold, somewhere cheaper to live, reduces what you need every month for the rest of your life. That’s a guaranteed, compounding improvement in your position, and nothing in a portfolio offers the same certainty. At twenty-five, the return is the lever. At fifty-five, the floor usually is.' },
      { h: 'Work out what you will actually need, not a rule of thumb',
        p: 'The advice to replace seventy or eighty percent of your income is a generic figure for a generic person. If your mortgage is gone by then, if the children are independent, if the commuting stops: the number is often far lower than the rule suggests, and people abandon planning because a made-up target looks impossible. Work out what your life actually costs in the version you’re heading for.' },
      { h: 'What you have that doesn’t look like savings',
        p: 'Equity in a property, a pension from an old employer you have half-forgotten, government benefits you’re entitled to, a vehicle or tools worth real money, a skill somebody pays for. None of these look like a retirement account and all of them count. Write them down before concluding there’s nothing there, people in this position routinely underestimate their own position because they’re measuring against a savings balance that doesn’t exist.' },
      { h: 'Working longer is a lever, and it isn’t the only one',
        p: 'Every extra year is a year of earning and a year less to fund, so it moves the number twice. But it isn’t the only option and it isn’t always available, health and industry decide that as much as willpower. Part-time, seasonal or consulting work in the same trade often produces more than expected and is a different question from working full-time longer.' },
      { h: 'What to be careful of',
        p: 'Anyone promising to make up lost time with above-average returns is describing above-average risk, and this is the stage of life where a bad few years can’t be waited out. The same goes for schemes that require borrowing against a property to invest. Behind on a target is uncomfortable; behind and leveraged is a different situation entirely.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage or put money into retirement savings?',
        a: 'Compare the mortgage rate to what you would realistically earn after tax, then weigh the certainty. Clearing the mortgage is guaranteed and it lowers what you need every month afterwards, which matters more the fewer years you have. There are tax-advantaged accounts that change this arithmetic, and that’s a question worth one conversation with an accountant.' },
      { q: 'Is it worth starting to save if I only have ten years?',
        a: 'Yes, though for a different reason than compounding. Money set aside in the next ten years is money not spent, and it’s available at exactly the point you most need flexibility. The returns are secondary; the habit and the buffer are the point.' },
      { q: 'How much do I actually need?',
        a: 'It depends entirely on what your life will cost, which is why generic percentages mislead. Work out what must go out each month in the version of your life you’re heading toward, with the mortgage gone, if it will be, and that’s the real target.' },
      { q: 'Should I see a financial planner?',
        a: 'A fee-only one, meaning paid for their time rather than by commission on what they sell you, can be useful here. The distinction matters: somebody paid by the product has a reason to prefer certain answers.' },
    ],
  },

  {
    slug: 'sell-the-house-to-pay-off-debt',
    question: 'Should I sell my house to pay off debt?',
    intro: 'Equity on one side, expensive debt on the other',
    updated: '2026-09-27',
    answer:
      'The debt disappearing isn’t the test. Plenty of people clear it and are worse off by spring. What decides this is what your month looks like on the other side: whether the equity covers the debt and somewhere to live, and what your costs are once the house is gone. Work that out before you ring an agent.',
    body: [
      { h: 'Do the whole sum, not just the debt half',
        p: 'It’s easy to see equity that exceeds the debt and conclude the problem is solved. The part that gets missed is that you still have to live somewhere, and rent or a smaller mortgage is a new monthly cost replacing the old one. The honest comparison is what must go out every month before, against what must go out every month after, including wherever you end up.' },
      { h: 'Where selling clearly helps',
        p: 'If the debt is at card rates and the equity comfortably covers both it and a place to live, selling converts an expensive, compounding problem into a solved one. If the housing itself is the problem, a payment that was affordable when it started and isn’t now, then removing it addresses the cause rather than the symptom, and the debt was probably a consequence of it.' },
      { h: 'Where it doesn’t help, said plainly',
        p: 'If the equity clears the debt but leaves nothing toward somewhere to live, you have exchanged a debt for a rent payment and lost the asset. If the debt would rebuild because the monthly position hasn’t changed, the sale buys a year and costs you the house. Both outcomes are common and both are foreseeable with the arithmetic done beforehand.' },
      { h: 'The options between keeping and selling',
        p: 'It’s rarely a binary. Renting out a room changes a monthly position without selling anything. Refinancing or a secured consolidation may lower the rate on the debt without the house moving: at the cost of turning short debt into long debt, which is a real cost and not always the wrong one. Selling and buying something smaller keeps the asset and lowers the floor. These have different outcomes and the right one depends on things a page can’t know about your life.' },
      { h: 'What to find out, and who to ask',
        p: 'What the property would realistically clear after commission, any mortgage payout penalty and closing costs: a realtor produces that free, in one conversation, before you list. What the debt actually costs you per month and at what rate, which is on the statement. And a realistic monthly cost for where you would live instead. Three numbers, none of them expensive, and together they answer the question.' },
      { h: 'Before you sell anything, talk to somebody free',
        p: 'A non-profit credit counselling service will look at the whole picture at no cost and has no product to sell you. They can sometimes arrange reduced rates with creditors directly, which changes the arithmetic enough that selling stops being necessary. It’s worth one conversation before a decision this size, and it isn’t the same thing as a debt consolidation company advertising the same words.' },
    ],
    faqs: [
      { q: 'Will selling my house hurt my credit?',
        a: 'Selling itself doesn’t. Paying off debt generally helps over time. What hurts is missing payments while you decide, so keep the minimums going through the process even if it means the decision takes longer.' },
      { q: 'Is a consolidation loan better than selling?',
        a: 'It can be, if it lowers the rate and you don’t rebuild the balance. The risk is that it converts unsecured debt into debt secured against your home, which lowers the payment and raises the stakes. Read what it’s secured against before anything else.' },
      { q: 'What if my partner doesn’t want to sell?',
        a: 'Then that’s the first constraint rather than an obstacle to overcome. Disagreements about selling a home are usually about security rather than numbers, and doing the arithmetic together gives the conversation something concrete to be about.' },
      { q: 'How long does it take?',
        a: 'Typically a few months from listing to money in hand, and that’s the part you don’t control. If the debt is at card rates it keeps growing through all of it, which is an argument for dealing with the rate in the meantime rather than waiting.' },
    ],
  },

  {
    slug: 'want-to-leave-my-job-but-cannot-afford-to',
    question: 'I want to leave my job but can’t afford to. What actually has to change?',
    intro: 'Stuck in work you want out of',
    updated: '2026-09-27',
    answer:
      'Usually one number, not your whole situation. Work out what must go out each month, then what the new thing would have to produce to cover it. The gap is usually smaller than it feels, because people compare against their current salary rather than against what they actually need.',
    body: [
      { h: 'You’re comparing against the wrong number',
        p: 'The instinctive sum is: I earn this, so the new thing has to earn this. That’s rarely the real bar. What it has to cover is what must go out, and if leaving also removes costs, those come off the target too. Commuting, a second vehicle, the childcare that exists because of your hours, the work clothes. People routinely discover the target is thousands lower than the salary they were trying to match.' },
      { h: 'Find out what the actual gap is before deciding it’s impossible',
        p: 'Two figures. What must leave every month, and what the alternative realistically brings in at the start rather than once it’s established. The difference is the gap, and it’s a number rather than a feeling. Most people in this position have never written it down, which means the thing stopping them is undefined, and an undefined obstacle can’t be planned around.' },
      { h: 'The gap is usually closed from both ends',
        p: 'It’s tempting to look only at the income side, because that’s the exciting half. But a gap closes just as well by lowering the floor, and that half is usually faster and more certain. A cost removed is money that arrives every month without a customer. In practice most people who get out do both, and the cost side moves first because it doesn’t need anyone else to say yes.' },
      { h: 'Leaving is rarely one step and doesn’t have to be',
        p: 'The version where you resign and begin is one option and usually the riskiest. Starting the new thing alongside the old job, going part-time, using holiday to test it, or taking on the first customers before you need them are all real routes, and they trade speed for certainty. Which trade is right depends on how much risk your situation can carry: somebody with dependants and no savings is in a different position from somebody with six months of costs banked, and the same advice doesn’t fit both.' },
      { h: 'What makes the difference is a gate, not a date',
        p: 'A date is a wish. A gate is a fact that becomes true: three paying customers, two months of the new income landing, the debt cleared. Deciding in advance what would have to be true before you hand in notice turns an agonising open question into a checkable one, and it stops both of the common failures: leaving too early on optimism, and never leaving because the moment never feels right.' },
      { h: 'Where the honest answer isn’t yet',
        p: 'If the floor is high, the savings are thin and the new thing has produced nothing yet, the answer is that the conditions aren’t there, and that’s worth saying plainly rather than encouraging. The useful response isn’t to abandon it but to work on the two things that change it: lower the floor, and get the first real evidence that somebody pays for the new thing. Both are available now, and neither requires quitting anything.' },
    ],
    faqs: [
      { q: 'How much should I have saved before leaving?',
        a: 'The usual answer is three to six months of what has to go out, but the honest one depends on who relies on you and how quickly the new income starts. What matters more than the multiple is knowing your monthly floor, because "six months of savings" means nothing until you know six months of what.' },
      { q: 'Should I tell my employer I am planning to leave?',
        a: 'Generally not until you have decided, and that’s about your position rather than theirs. The exception is where fewer hours would help, in which case asking is a reasonable conversation and the worst outcome is usually no.' },
      { q: 'Is it better to find another job or work for myself?',
        a: 'They’re different problems. Another job changes the conditions quickly and keeps the income certain. Working for yourself changes who decides, and takes longer to produce reliable money. Many people who think they want the second actually want the first, and the way to find out is to be specific about which part of the current job is the problem.' },
      { q: 'What if I hate the job and can’t wait?',
        a: 'Then shorten the timeline rather than skip the arithmetic. Knowing the number doesn’t slow anything down, it’s a single evening, and it’s the difference between leaving with a plan and leaving into the same situation with less income.' },
    ],
  },

  {
    slug: 'lump-sum-what-to-do-first',
    question: 'I am about to get a lump sum. What should I do with it first?',
    intro: 'A one-off amount, and a lot of opinions about it',
    updated: '2026-09-27',
    answer:
      'Do nothing with it for a few weeks. Money that arrives all at once attracts decisions, and the ones made in the first two weeks are the ones people regret. The only move that can’t be wrong is clearing the most expensive debt. It’s a guaranteed return, so it’s the safe thing to do while you think.',
    body: [
      { h: 'The first decision is to not decide yet',
        p: 'A severance payment, an inheritance, a settlement or a sale arrives with pressure attached: from people with opinions, from your own sense that it should be doing something, and sometimes from whatever caused it. Parking it somewhere boring for a few weeks costs you almost nothing in interest and prevents the category of decision that gets regretted. Nothing about this money expires in a two weeks.' },
      { h: 'Clear the expensive debt, because it’s the only certain return',
        p: 'A balance at card rates costs you that much every year, guaranteed. Paying it off earns you exactly that, also guaranteed, with no risk. Nothing available to an ordinary person reliably beats it, and anything claiming to is taking risk it isn’t describing. Order by rate, highest first, and ignore the size of the balances. A small balance at 21% costs more each month than a large one at 4%.' },
      { h: 'Keep a real buffer before anything clever',
        p: 'Whatever else happens, some of it stays accessible. The purpose isn’t returns, it’s that the next unexpected cost doesn’t go back onto a card at the rate you just cleared. How much depends on your situation, how stable the income is, who depends on you, but committing all of it and leaving nothing is the most common and most expensive mistake with money like this.' },
      { h: 'Then the real question: what’s it for?',
        p: 'After the expensive debt and the buffer, the remainder has different uses and no universally right answer. Lowering your monthly floor permanently, clearing a mortgage, buying somewhere outright, reduces what you need for the rest of your life. Producing income replaces a wage, if it clears its costs with somebody else running it. Holding it keeps every option open and loses ground to inflation. Which is right depends on whether you need certainty, freedom or time, and those aren’t the same thing.' },
      { h: 'Where the money came from changes the arithmetic',
        p: 'Severance may be taxable in the year you receive it. An inheritance may have already been taxed at the estate, or may not. A settlement may be treated differently again. This varies by where you live and by the source, and it decides how much you actually have, which is worth one conversation with an accountant before anything is committed, though not a reason to delay working out what you want.' },
      { h: 'A note on the people who appear',
        p: 'Money that arrives visibly tends to attract advice, some of it from people who are paid by what you choose. A fee-only adviser is paid for their time; a commission-based one is paid by the product. Both can be competent and only one has a reason to prefer certain answers. Asking how somebody is paid is a fair question and the answer tells you what to weigh.' },
    ],
    faqs: [
      { q: 'Should I pay off the mortgage with it?',
        a: 'It’s one of the strongest options, especially if you want lower monthly costs rather than a bigger balance. Compare the mortgage rate to what you would realistically earn after tax, and count the certainty on the mortgage side. It’s guaranteed, and it lowers what you need every month permanently.' },
      { q: 'How long should I wait before deciding?',
        a: 'A few weeks is usually enough to get past the initial pressure without drifting. Longer is fine. The only thing that should happen immediately is clearing debt at high rates, because that’s costing you money every day it waits.' },
      { q: 'Should I tell people about it?',
        a: 'Fewer than you think. It isn’t secrecy so much as that unsolicited opinions about a lump sum are rarely about your situation. The people who need to know are the ones the decision affects.' },
      { q: 'Is it worth paying someone for advice?',
        a: 'If the amount is large or the tax position is unclear, one conversation with a fee-only planner or an accountant is money well spent. Ask how they’re paid before you book, and be cautious of anyone who leads with a product rather than a question.' },
    ],
  },

  {
    slug: 'is-renting-out-a-room-worth-it',
    question: 'Is renting out a room actually worth it?',
    intro: 'Space you already have, and whether it changes anything',
    updated: '2026-09-27',
    answer:
      'The money is usually real, so that isn’t the question. This is one of the very few moves that changes your month without capital, a customer or a new skill. What decides it is what you give up: your evenings, your kitchen, who is in the house when you get home. That’s a real cost, not a detail.',
    body: [
      { h: 'Why it works when other things don’t',
        p: 'Most ways of improving a monthly position need something you may not have: money to start, customers to find, time you’re not working. A spare room needs none of those. The asset already exists, the cost of using it is close to zero, and the income starts within weeks rather than months. For somebody with no slack, that combination is rare and worth taking seriously even if it isn’t appealing.' },
      { h: 'What it’s actually worth, and how to find out',
        p: 'Don’t guess. Search what comparable rooms in your area are currently listed at. Not what you hope, and not what somebody told you. Then subtract what an extra person costs in utilities and wear. What’s left is the real monthly figure, and it’s the one to compare against your gap. This takes twenty minutes and it’s the difference between a plan and a hope.' },
      { h: 'Who you rent to changes what it is',
        p: 'A long-term tenant is predictable income that arrives whether or not you did anything that week. A travelling professional or somebody on a rotation is often less present and pays more, and is harder to find. Short-stay guests can pay considerably more per night and are a job rather than an arrangement: cleaning, messaging, turnover. These are different choices and the money isn’t the only difference between them.' },
      { h: 'The cost that doesn’t appear in the arithmetic',
        p: 'Someone else is in your home. That affects everyone who lives there, and it’s a real cost even when the money is good. It matters more where there are children, where somebody works shifts and sleeps during the day, or where the household is already under strain. This isn’t a reason not to do it. It’s a reason to make the decision with the people it affects rather than presenting it to them.' },
      { h: 'The practical things people find out late',
        p: 'A mortgage or lease may have terms about occupants. Home insurance often treats a paying occupant differently and may need adjusting. Rental income is usually taxable, and some expenses may be deductible against it. Local rules on rentals, especially short-stay, vary enormously and change. None of these are dramatic, and all of them are cheaper to check before somebody moves in than afterwards.' },
      { h: 'How to test it without committing',
        p: 'You can find out whether the demand is real before changing anything: list it and see what response comes back. If nobody answers in two weeks, that’s your answer and it cost you nothing. If the enquiries are steady, you’re choosing rather than hoping. Doing it in this order also means the conversation at home is about a real offer rather than a hypothetical.' },
      { h: 'What it buys beyond the money',
        p: 'A few hundred a month against a monthly gap is often the difference between a plan that works and one that doesn’t, and unlike cutting spending, it doesn’t have to be sustained by willpower. It’s also reversible, which very little else in this situation is. If it turns out to be wrong for the household, it ends at the notice period.' },
    ],
    faqs: [
      { q: 'Do I have to declare the income?',
        a: 'In most places yes, and some expenses may be deductible against it. The rules vary by country and sometimes by region, and some jurisdictions have specific allowances for renting a room in your own home. Worth checking for where you live before the first payment rather than after.' },
      { q: 'What if it doesn’t work out with the person?',
        a: 'This is why the agreement matters more than it feels like it should. Put the notice period in writing before anyone moves in, and understand what rights someone renting a room in your home has where you live. They differ substantially from a tenant in a separate property.' },
      { q: 'Is short-stay letting better money?',
        a: 'Usually more per night and much more work, with the income varying by season and occupancy rather than arriving as a fixed amount. It’s a job. A long-term arrangement pays less and is predictable. Which is better depends on whether you need reliability or maximum income.' },
      { q: 'How do I find somebody reliable?',
        a: 'References, and actually contacting them. Ask how long the last arrangement lasted and why it ended. People are generally who they appear to be, and the small number who aren’t usually have a history that a phone call finds.' },
    ],
  },

  {
    slug: 'working-but-no-fixed-address',
    question: 'I am working but I have nowhere stable to live. How do I get out of this?',
    intro: 'A job, and no fixed address',
    updated: '2026-09-27',
    answer:
      'The wall is usually the deposit, not the rent. Being without a stable address costs more per week than being housed, nightly rooms, eating without a kitchen, laundromats, storage, so the money that would become a deposit gets eaten by the cost of not having one. Attack the deposit directly, because that’s the actual obstacle.',
    body: [
      { h: 'This costs more than being housed, and that’s the trap',
        p: 'A room by the night costs more per month than most rents. No kitchen means buying food already made. No laundry means a laundromat. Storage for what you couldn’t carry is another monthly bill. Somebody working and unhoused is frequently paying more per week than the flat they can’t get into, which is why saving toward a deposit out of what’s left over usually fails. It isn’t a discipline problem. The arithmetic is against you.' },
      { h: 'The deposit is the wall, so treat it as the target',
        p: 'First month, last month or a damage deposit, sometimes all three, is a lump that has to exist at one moment. That’s a different problem from affording the rent, and people who could comfortably pay the rent stay out because of it. Naming it as the specific obstacle changes what you’re looking for: not a better job, not a cheaper flat, but a way to assemble one lump once.' },
      { h: 'Where deposit money actually comes from',
        p: 'More sources exist than most people are told about. Many regions run rent-bank or deposit-assistance programs that lend or grant exactly this, and they’re not widely advertised. Some employers will advance wages against work already done, and it costs nothing to ask a payroll manager. A room in a shared house is usually a fraction of the deposit of a whole flat and is available faster. And a landlord will sometimes take a larger first payment instead of last-month, if asked directly. That’s a conversation, not a policy.' },
      { h: 'The address problem, which blocks everything else',
        p: 'No address means difficulty with a bank account, with benefits, with job applications, with a driving licence. It’s the thing that quietly stops other things working. A shelter or a drop-in centre will usually receive post, some employers will, and in many countries the post office offers general delivery. It’s worth solving early even though it isn’t the thing that feels urgent, because a surprising number of doors are shut behind it.' },
      { h: 'What to protect while you’re in it',
        p: 'Three things are worth more than they look. Whatever documents you have, identification, a birth certificate, a bank card, because replacing them without an address is slow and expensive. The job, because income is what makes every other option possible and exhaustion is the thing most likely to cost it. And somewhere to sleep that lets you be functional, which is why the cheapest option isn’t always the right one.' },
      { h: 'The shared room is usually faster than the flat',
        p: 'A room in somebody else house, a room-share, a lodging arrangement. These have smaller deposits, quicker turnarounds and fewer checks than a tenancy. They’re not what most people picture as the goal, and they’re frequently the step that gets somebody off the nightly-rate treadmill, at which point saving actually starts working. Getting the weekly cost down is what turns the maths around.' },
      { h: 'Where to ask, and it’s free',
        p: 'In Canada and the US, dialling 211 reaches a service that knows what exists locally, housing help, deposit programs, emergency funds, and it costs nothing. A housing worker at a drop-in or shelter usually knows which landlords take people without a rental history, which is knowledge you can’t search for. Asking isn’t a last resort and it isn’t the same as needing rescue.' },
    ],
    faqs: [
      { q: 'Can I get a bank account without a fixed address?',
        a: 'Usually yes, though it varies by country and bank. Shelters and drop-in centres often help with exactly this, and some banks have accounts designed for it. It’s worth asking more than one, the answer differs by branch more than people expect.' },
      { q: 'Should I tell my employer?',
        a: 'Your call, and it depends entirely on the employer. Some will advance wages, adjust shifts or know of housing. Some won’t. If you do say something, asking for a specific thing, an advance, a reference for a landlord, usually goes better than explaining the situation and waiting.' },
      { q: 'Is a shelter better than sleeping in my car?',
        a: 'It depends on the shelter, on whether your work hours fit its rules, and on what you would have to leave behind. Many people working night shifts can’t use one because of curfews. A housing worker can tell you what’s actually available locally rather than what should be.' },
      { q: 'How long does it usually take to get housed?',
        a: 'Weeks to months, and it depends far more on the deposit and on finding a landlord who will take you than on your income. That’s why the deposit is the thing to attack. It’s the part of the timeline you can shorten.' },
    ],
  },

  {
    slug: 'twenty-six-and-feel-behind',
    question: 'I am in my twenties and feel behind everyone. Am I?',
    intro: 'No crisis, no direction, and everyone else seems further along',
    updated: '2026-09-27',
    answer:
      'Probably not, and the feeling usually comes from comparing against a highlight reel rather than a number. Work out what you actually need each month and what you have spare. Most people who feel behind at this age have more room than they think, and no destination, which is a different problem and a better one to have.',
    body: [
      { h: 'Behind what, exactly?',
        p: 'The feeling is real and the comparison is usually against nothing specific: a sense that other people have houses, careers and certainty. In practice that’s assembled from the most visible moments of a few dozen people, not a median. The useful move is to replace the feeling with a number: what has to go out each month, what comes in, what’s left. That converts an anxiety into arithmetic, and arithmetic can be acted on.' },
      { h: 'Spare money with no destination feels like nothing',
        p: 'If there’s room at the end of the month and it has no job, it disappears, and the disappearing is what feels like being behind. Money without a destination gets spent. Not through weakness, but because nothing is claiming it. Giving it a purpose, even a modest one, changes how it behaves. This is the opposite of most money advice, which assumes the problem is that there’s nothing spare.' },
      { h: 'What actually compounds at this age is time, and it’s the one thing you have',
        p: 'The advantage of starting early isn’t discipline, it’s duration, and it’s the single thing somebody older can’t buy back. That cuts both ways and it’s worth being honest about it: it makes early saving unusually powerful, and it also means an unhurried few years aren’t the catastrophe they feel like. Both are true.' },
      { h: 'The two things worth doing before any investing decision',
        p: 'Clear anything at card rates, because a guaranteed high return beats an uncertain one and there’s no argument at those rates. And build a buffer that means an unexpected bill doesn’t become debt. Those two are unglamorous and they’re the whole foundation. Almost everything else at this stage is optimisation of a base that isn’t there yet.' },
      { h: 'Direction is the real problem, and it isn’t a money problem',
        p: 'A lot of people who describe feeling behind aren’t short of money. They’re short of a destination, and the money question is where the discomfort surfaces because it’s measurable. It’s worth asking what you actually want a week to look like in three years, in ordinary detail: what time you get up, who is around, what you do that morning. Vague answers produce vague plans. That question is harder than the budgeting and it’s the one that matters.' },
      { h: 'What not to do about the feeling',
        p: 'Borrowing to look level with people who aren’t actually level is the expensive version of this, and it converts a feeling into a real problem. So is a course or a qualification bought to feel like progress rather than because a specific door needs it. Both are common, and both are the feeling being solved rather than the situation.' },
    ],
    faqs: [
      { q: 'Should I be saving for a house at my age?',
        a: 'Only if you want one, and in a place you intend to stay. A deposit saved toward a vague idea of a house is money with a destination, which is better than none, but it’s worth being honest about whether it’s your goal or the one you absorbed.' },
      { q: 'Is it bad that I don’t know what I want to do?',
        a: 'It’s common and it isn’t a financial emergency. What it does mean is that flexibility is worth more to you than it would be to somebody settled, which argues for a buffer and against long commitments, rather than for panic.' },
      { q: 'Should I take the higher-paying job I wouldn’t enjoy?',
        a: 'Depends what the money is for. Money with a purpose and an end date, clear the debt, build the buffer, then reassess, is a different proposition from money for its own sake. The version without an end date is the one people regret.' },
      { q: 'How much should I have saved by thirty?',
        a: 'There’s no real answer, and the figures circulated are built from averages that describe nobody. A more useful question is whether an unexpected bill would become debt. If not, you have the thing the number was trying to measure.' },
    ],
  },

  {
    slug: 'just-been-laid-off',
    question: 'I have just been laid off. What should I do first?',
    intro: 'Severance in hand, and no plan yet',
    updated: '2026-09-27',
    answer:
      'Work out how many months of what has to go out you can cover, before deciding anything else. That number is your actual runway, and it turns an open-ended panic into a deadline you can plan against. File for benefits in the same week. They often take time to start, and waiting costs you weeks at the end.',
    body: [
      { h: 'Runway is the first number, and almost nobody has it',
        p: 'Take what has to go out every month, then divide what you have, severance, savings, anything liquid, by it. That’s how many months you have. It sounds obvious and most people skip it, which is why the fear is open-ended. A number gives you a date to plan toward, and it’s usually longer than the feeling suggests once you subtract the costs that leave with the job: commuting, childcare tied to your hours, the second vehicle.' },
      { h: 'Do the paperwork in the first week even if you don’t feel like it',
        p: 'Unemployment benefits frequently take weeks to begin and some have waiting periods, so filing late shortens your runway at the far end where it hurts most. Same for anything the employer owes: accrued holiday, a final pay run, a pension decision with a deadline. This is the least interesting part and it’s the one that’s time-limited.' },
      { h: 'Understand the severance before you spend any of it',
        p: 'Whether it’s taxed as one lump in this year matters, and it can move you into a different bracket. Whether accepting it waives anything matters more. If there’s any question about how the termination was handled, a single consultation is cheap relative to the amount at stake, and there’s often a short window in which anything can be raised at all.' },
      { h: 'Lower the floor early, not late',
        p: 'The instinct is to cut hard only when the money gets frightening. Doing it in week one buys more months than doing it in month four, because every reduction repeats. Recurring costs first: subscriptions, insurance worth re-quoting, anything on an automatic renewal. A cost removed now works every month of the runway.' },
      { h: 'The question underneath the job search',
        p: 'A layoff is one of the few moments when the default resets, and that’s worth something even though nobody asks for it this way. The same search runs whether you’re looking for the same job elsewhere or something different, but the answer decides what you’re actually looking for. It’s worth deciding on purpose rather than by momentum, while the runway is long enough to allow a choice.' },
      { h: 'What not to do with the money',
        p: 'Severance is runway, not a windfall. The two common mistakes are treating it as a bonus, and using all of it to pay down debt while leaving nothing to live on. The second feels responsible and can put the whole month back on a card at a worse rate. Clear expensive debt if the runway comfortably allows, and keep the runway.' },
    ],
    faqs: [
      { q: 'Should I take the first job I am offered?',
        a: 'It depends on the runway. With months of it, waiting for the right thing is a real option. With weeks, income now beats income later and you can keep looking from inside a job. The number tells you which situation you are in.' },
      { q: 'Should I use severance to pay off debt?',
        a: 'Expensive debt, yes, if it leaves enough runway. The order matters: work out the months first, then decide what paying down the debt costs you in months. Paying off a card and having nothing to live on is a trade, not a saving.' },
      { q: 'Can I claim benefits if I got severance?',
        a: 'Usually yes, though severance can delay when payments start depending on where you live. That’s a reason to file early and find out, not a reason to wait.' },
      { q: 'Is it worth retraining?',
        a: 'Sometimes, and it’s worth being specific about which door it opens. A qualification bought because a named employer or licence requires it is an investment. One bought to feel like progress is an expense during the months you can least afford one.' },
    ],
  },

  {
    slug: 'separated-and-the-money-does-not-work',
    question: 'We have separated and the money doesn’t work any more. Where do I start?',
    intro: 'One household became two, on the same income',
    updated: '2026-09-27',
    answer:
      'Work out what one household costs you now, on your own, before agreeing anything. Two homes on one income is arithmetic that rarely works unchanged, which is why the housing decision usually comes first and everything else follows it. Get your own number before any conversation about who pays what.',
    body: [
      { h: 'The arithmetic changed, not your ability to manage',
        p: 'A separation splits one set of fixed costs into two. Rent or mortgage, utilities, internet, insurance. Most of them don’t halve, they duplicate. People frequently read the resulting shortfall as having mismanaged something, when the same income is simply covering a structurally more expensive arrangement. Naming that correctly matters, because it points at the housing decision rather than at spending.' },
      { h: 'What you have to pay each month comes before any negotiation',
        p: 'Before agreeing to anything about who pays what, work out what you alone must cover each month in the arrangement you’re heading into. Without it you’re negotiating in the dark, and agreements made that way tend to be the ones revisited painfully later. It takes an evening and it’s the single most useful thing you can do in the first weeks.' },
      { h: 'The house is usually the decision everything else waits on',
        p: 'Whether it’s sold, whether one of you stays, whether it’s rented: that decision sets the floor for both households, and most other questions are downstream of it. It’s also the hardest, because it carries more than money, particularly where children are involved. But leaving it open keeps everything else provisional, and provisional is expensive.' },
      { h: 'Separate the money mechanics early',
        p: 'Joint accounts, shared cards, direct debits coming out of one account for both lives, and anything either of you can borrow against jointly. This is unglamorous administration and it prevents the specific category of problem where one person unknowingly becomes liable for the other. Doing it early isn’t an act of hostility and is much easier than doing it after something goes wrong.' },
      { h: 'Where this needs a professional, and where it doesn’t',
        p: 'How assets, pensions and support are treated varies enormously by jurisdiction and by circumstance, and getting that wrong is expensive in a way that lasts years. That’s a real question for a family lawyer, and many offer a fixed-fee first consultation. Mediation is usually far cheaper than two lawyers negotiating and works when both people can be in a room. What does NOT need a professional is working out what your own life costs. That’s yours, and it makes every professional conversation shorter.' },
      { h: 'One thing worth protecting deliberately',
        p: 'Where one person has managed the money, the other frequently leaves without a credit history, an account or a clear picture of what exists. Opening an account in your own name and knowing what’s held where is worth doing early, quietly and without drama. It isn’t an aggressive act. It’s the difference between having options and discovering you don’t.' },
    ],
    faqs: [
      { q: 'Do I need a lawyer?',
        a: 'For how assets, pensions and support are handled, usually yes. The rules vary and mistakes last. For working out what your own life costs, no. Doing the second before the first makes the first shorter and cheaper.' },
      { q: 'Who pays the mortgage in the meantime?',
        a: 'Whatever you agree, get it in writing, and be aware that a joint mortgage means the lender considers you both liable regardless of any private arrangement. A missed payment affects both credit files even if only one person was supposed to pay it.' },
      { q: 'Should I move out?',
        a: 'It can have legal consequences depending on where you live and on whether children are involved, worth asking before doing, not after. If safety is a factor, that overrides everything here.' },
      { q: 'How do we split things fairly?',
        a: 'Fair and legal are different, and what a court would consider differs by place. Mediation tends to produce arrangements people actually keep, which is worth more than winning a point that gets revisited.' },
    ],
  },

  {
    slug: 'about-to-lose-my-housing',
    question: 'I think I am about to lose my housing. What can I actually do?',
    intro: 'Behind on rent, or the notice has arrived',
    updated: '2026-09-27',
    answer:
      'Talk to the landlord before the arrears grow, and find out what the actual timeline is where you live. It’s usually longer than it feels, and that time is the thing you can use. Emergency rent help exists in most places and isn’t widely advertised. Dialling 211 in Canada or the US reaches somebody who knows what’s available locally.',
    body: [
      { h: 'Find out the real timeline, because the fear runs ahead of it',
        p: 'Eviction is a legal process with steps and dates, and it varies by jurisdiction. The gap between falling behind and having to leave is usually measured in weeks or months rather than days, and knowing the actual sequence turns panic into a period you can plan inside. A tenant advice service, a legal clinic or a housing worker will tell you the process where you live, free.' },
      { h: 'The landlord conversation is worth more than it feels',
        p: 'A landlord facing an empty unit, a cost of finding a new tenant and a legal process often prefers an arrangement to an eviction, and many will accept a written payment plan. Going first, before the arrears grow, is a much stronger position than being chased. It’s an uncomfortable conversation and it’s frequently the one that changes the outcome.' },
      { h: 'Emergency help exists and isn’t advertised',
        p: 'Many regions run rent banks, arrears grants or one-off emergency funds specifically to stop an eviction, because preventing one is far cheaper than housing somebody afterwards. These are rarely visible unless you know they exist. In Canada and the US, 211 connects to somebody who knows what’s available locally; a housing worker at any drop-in will know the same. Asking early matters, because most of these are for preventing a loss rather than responding to one.' },
      { h: 'What to prioritise if there isn’t enough to go round',
        p: 'When the money can’t cover everything, the order is about consequences rather than fairness. Housing and anything that keeps you able to work, transport, a licence, a phone, come before unsecured debts. A missed card payment is expensive and recoverable. Losing housing is expensive, slow to reverse, and makes everything else harder. Creditors can wait; that isn’t advice to ignore them, it’s an order of operations.' },
      { h: 'Start the parallel search now, not when it’s decided',
        p: 'Looking for somewhere while you still have an address, a current tenancy and a reference is very different from looking after. Even if you expect to stay, beginning quietly now costs nothing and removes the worst version of the outcome. A room in a shared place is faster and needs a smaller deposit than a whole flat, often the difference between a step sideways and a crisis.' },
      { h: 'Where this stops being a planning problem',
        p: 'If there’s violence at home, if the utilities are being cut this week, or if there’s nowhere to go tonight, this isn’t the kind of problem a plan addresses and it shouldn’t wait for one. In Canada and the US, 211 for housing and services, 988 for crisis support by call or text, 911 if anybody is in immediate danger. findahelpline.com lists a service in most countries. That isn’t a smaller step than planning. It’s the correct one.' },
    ],
    faqs: [
      { q: 'How long does an eviction actually take?',
        a: 'It varies widely by jurisdiction and on the reason, and it’s usually a process with notice periods and a hearing rather than an immediate removal. A tenant advice service or legal clinic will tell you the sequence where you live, free, and that’s the first call worth making.' },
      { q: 'Will this affect my ability to rent again?',
        a: 'It can, which is one reason an agreement with a landlord is worth more than a judgment. Where a formal record exists, being able to show a payment plan you kept matters to the next landlord.' },
      { q: 'Should I pay rent or my credit card?',
        a: 'Rent, in almost every case. The consequences aren’t comparable: a card is expensive and recoverable, and losing housing is neither.' },
      { q: 'Is it worth talking to the landlord if I can’t pay anything?',
        a: 'Yes. Even a partial arrangement, or notice that you’re looking for help, changes how a landlord proceeds. Silence reads as abandonment and speeds things up.' },
    ],
  },
  {
    /**
     * ⭐⭐ THE GAP THE AUDIT FOUND, AND IT IS THE ONE CLOSEST TO DANIEL'S OWN
     * WORLD. Five of the first fourteen pages were about housing; nothing at all
     * covered the owner whose business is the trap — turning over well, nothing
     * left, and unable to stop because stopping is worse.
     *
     * ⚠️ THE LEAD IS A REVERSAL BECAUSE THE REVERSAL IS TRUE, not because it
     * reads well: almost nobody in this position has a sales problem, and being
     * told to sell more is why they’re still here.
     */
    slug: 'business-makes-money-but-i-never-do',
    question: 'My business makes money but I never seem to. What’s actually wrong?',
    intro: 'Turning over well, and nothing left at the end of it',
    updated: '2026-09-27',
    answer:
      'Almost nobody in this position has a sales problem. You’re either underpriced, owed money, or paying yourself last, and from the bank balance all three look exactly the same. Which one it is decides what you do next, and you can work it out in an evening with a list of last month’s jobs.',
    body: [
      { h: 'Three things it can be, and they look identical from the outside',
        p: 'Money comes in, money goes out, nothing stays. That single symptom has three completely different causes, and the treatments contradict each other. Underpriced means every new job makes it worse. Owed means the work is done and the money exists but is sitting with somebody else. Paying yourself last means the business is solvent and you’re not. Chasing more work fixes none of them, and makes the first two worse, which is exactly why working harder hasn’t moved this.' },
      { h: 'Underpriced: the test takes ten minutes',
        p: 'Take last month’s jobs. For each one, write what you charged and roughly what it cost you: materials, subcontractors, and your hours at a rate you would pay somebody else to do it. Not what you wish it cost. What it cost. If a job you were proud of comes out flat or negative once your own time is in there, you’re not busy, you’re subsidising customers. The uncomfortable part is that the jobs you like are often the worst offenders, because you don’t count your own hours on those.' },
      { h: 'Owed: the money is earned, it just isn’t here',
        p: 'Add up what has been invoiced and not paid, and how old each one is. Owners routinely discover a number that’s one to three months of their entire problem, sitting in other people’s accounts. This is the best case of the three, because nothing about the business has to change, the money already exists. It’s also the one owners avoid hardest, because chasing feels like admitting something. It isn’t. An invoice is a thing you have already paid for in labour and materials.' },
      { h: 'Paying yourself last is a decision, not a virtue',
        p: 'A lot of owners treat their own pay as whatever survives the month. That isn’t discipline, it’s a business whose costs haven’t all been counted, because your wage is a cost whether or not anybody writes it down. A business that can’t pay you is telling you something about its prices or its overheads, and the longer you absorb it personally the longer it takes to hear. Paying yourself a set amount, even a small one, is how the real number surfaces.' },
      { h: 'Why "just get more work" makes two of these worse',
        p: 'More volume at a price that doesn’t clear costs loses money faster. More volume from customers who pay late lends money faster. Only one of the three causes responds to more work, and it’s the one fewest owners have. This is the whole reason the year of extra effort didn’t land. The effort was real and it was aimed at the wrong thing.' },
      { h: 'What to do first, whichever one it turns out to be',
        p: 'Do the ten-minute job costing before anything else, because it decides everything after it. If the jobs are profitable and the money is late, the next move is collections, not sales. If the jobs aren’t profitable, no amount of collecting fixes it and the next conversation is about price. If both are fine and you’re still short, the problem is overheads or your own pay, and that’s arithmetic you can do on one page.' },
    ],
    faqs: [
      { q: 'Should I just raise my prices?',
        a: 'Only once you know which jobs are underwater, and by how much. A flat increase across everything moves the good work away along with the bad. The job costing tells you where the hole is, and usually it’s one type of work or one customer rather than the whole book.' },
      { q: 'How do I know if I am actually profitable?',
        a: 'Profitable means the business covers all its costs including a real wage for you, at a rate you would have to pay somebody else. If your own hours are free in the maths, the business isn’t profitable. It’s being funded by you, and that shows up as your empty account rather than the company’s.' },
      { q: 'I can’t chase invoices, they’re my biggest customer.',
        a: 'That’s a real constraint and worth being honest about, but it’s also worth naming what it costs: you’re lending them money at your own expense, and the size of that loan is knowable. Knowing the number doesn’t force you to act on it. It just stops it being invisible while you wonder where the money went.' },
      { q: 'Is a bookkeeper worth it at my size?',
        a: 'The question is whether not having one is currently costing more than one would. If you can’t answer what last month cleared, it probably is. This is general information rather than advice about your situation, and an accountant who can see your actual numbers is the right person to settle it.' },
    ],
  },
  {
    /**
     * ⭐⭐ THE SECOND GAP: the shameful one nobody writes honestly. Two decent
     * incomes and nothing at the end of the month is extremely common, heavily
     * searched, and usually answered with "cut out the coffee" — which is
     * both wrong and insulting, and is why the people it happens to stop reading.
     */
    slug: 'we-earn-good-money-and-have-nothing',
    question: 'We earn good money and have nothing to show for it. How?',
    intro: 'Two incomes, and nothing left at the end of the month',
    updated: '2026-09-27',
    answer:
      'This is almost never overspending in the way people mean it. What usually happened is that your fixed costs rose every time your income did, the house, the cars, the insurance, the school, so you’re running a bigger machine on the same margin. The number that tells the truth isn’t what you earn. It’s what you’d still owe if you both stopped tomorrow.',
    body: [
      { h: 'It’s not the coffee. Being told it was is why you stopped reading.',
        p: 'Small discretionary spending is the most visible part of a budget and almost never the reason a two-income household is flat. The arithmetic doesn’t support it: a few hundred a month of visible spending can’t absorb a raise. What absorbs a raise is a fixed cost that went up at the same time and never came back down, and fixed costs are the ones nobody looks at, because each one was a reasonable decision on the day it was made.' },
      { h: 'Every raise bought something permanent',
        p: 'This is the shape almost every version of this takes. Income went up, and within a year so did the house, or the vehicles, or the childcare, or the standard of holiday that now feels normal. None of it was reckless. But a raise spent on a mortgage is spent for twenty-five years, while a raise spent on anything else is spent once, so the margin never widened, it just moved to a bigger scale. You’re not worse with money than you were. You’re running more of it through a machine with the same clearance.' },
      { h: 'The number that tells the truth',
        p: 'Work out what would still have to go out if both of you stopped earning tomorrow: housing, the vehicles, insurance, minimum debt payments, the things with contracts. Not the groceries, not what you choose. That figure is your floor, and it’s the only number that says whether this is fixable by earning more or not. Households in this position are routinely shocked by it, and the shock is the useful part. It’s the first honest look at the machine.' },
      { h: 'Why earning more stopped working',
        p: 'If the floor rises with income, a raise changes the numbers on both sides of the page and the gap stays the same. That’s why the last increase didn’t feel like anything, and why the next one won’t either. Nothing is wrong with either of you. The mechanism simply doesn’t produce slack, and it won’t, however much the top line moves.' },
      { h: 'Two cuts beat twenty',
        p: 'Because the problem is fixed costs, the fix is fixed costs, and there are usually only two or three that matter. Housing and vehicles are usually the whole conversation. One decision on either does more than a year of small economies, and it does it permanently, which is the part that matters when the problem is a floor rather than a month. It’s also the harder conversation, which is why the small ones get suggested instead.' },
      { h: 'What changes when you know the floor',
        p: 'Knowing the number does two things at once. It tells you how much either of you could actually afford to lose, which is the question under most of the stress in a household like this. And it converts an argument about character, who is bad with money, into arithmetic that neither of you chose. Couples who do this often stop having the same fight, because it turns out nobody was doing anything wrong.' },
    ],
    faqs: [
      { q: 'Should we make a budget?',
        a: 'A budget tracks what you choose to spend, and that’s usually not where this problem lives. Work out the floor first, what has to go out regardless. If the floor is the problem, a budget will show you a year of trying hard and not moving, which is discouraging and not informative.' },
      { q: 'Is it wrong to want the nice house?',
        a: 'No, and nothing here says otherwise. The point is only that a house is a permanent claim on future income, so it deserves to be a decision rather than a consequence of a raise. Plenty of people look at the number and keep the house, which is a fine answer arrived at properly.' },
      { q: 'We both work, why does it feel worse than when we earned less?',
        a: 'Usually because the floor is higher and the slack is the same, so there’s more at stake and no more room. Two incomes committed to fixed costs also means either job going is now a bigger event than one job going used to be, and people feel that long before they can name it.' },
      { q: 'Where do we actually start?',
        a: 'With the floor, on one page, together, before any conversation about whose spending is the problem. It takes an evening and it usually ends the blame part, because the number doesn’t belong to either of you.' },
    ],
  },

  // ── United States (3 Oct 2026) ─────────────────────────────────────────────
  // ⚠️ US-specific facts here are federal and long-standing; anything that varies
  // by state is said to vary by state. No amounts that change year to year.
  {
    slug: 'lost-my-job-what-happens-to-health-insurance',
    question: 'I lost my job. What happens to my health insurance?',
    intro: 'In the US, where coverage usually comes with the job',
    updated: '2026-10-03',
    answer:
      'You have three routes and a deadline. You can keep your employer’s plan through COBRA, usually at the full cost; buy a plan on the Health Insurance Marketplace, where losing job-based coverage opens a special enrollment window; or get Medicaid if your income now qualifies. Compare all three this week. The cheapest is often not the one you are offered first.',
    body: [
      { h: 'COBRA keeps the same plan, at the full price',
        p: 'COBRA lets you stay on your employer’s health plan, usually for up to 18 months, with the same doctors and the same deductible you have already been paying toward. The catch is cost: you pay the whole premium your employer used to share, plus a small fee. You generally have 60 days to decide, and if you elect it, coverage reaches back to the day the old coverage ended, which makes it a safety net while you compare.' },
      { h: 'The Marketplace is often far cheaper when income drops',
        p: 'Losing job-based coverage is a qualifying event, so you can buy a plan on HealthCare.gov or your state’s marketplace outside the usual enrollment season, generally within 60 days of losing coverage. Help with the premium is based on what you expect to earn for the year, so if your income falls, the help rises. Many people pay a fraction of the COBRA price for a comparable plan.' },
      { h: 'Medicaid, if your income now qualifies',
        p: 'Medicaid is free or very low-cost coverage based on income, and the limits depend on your state. You can apply at any time of year, not just in an enrollment window. If your household income has dropped sharply, check it before paying for anything else.' },
      { h: 'Do not let it lapse without deciding',
        p: 'The real risk is a gap, weeks with no coverage because the decision got put off. Use the COBRA window as your backstop, price a Marketplace plan and check Medicaid in the same week, then choose. Write down the deadline on your COBRA notice; it is the date everything else hangs on.' },
      { h: 'Ask what else ends with the job',
        p: 'Dental, vision, life insurance and any health savings account behave differently. A health savings account is yours to keep; a flexible spending account often is not, so spend what is in it before the last day if you can.' },
    ],
    faqs: [
      { q: 'Is COBRA worth it?',
        a: 'It can be if you are mid-treatment, have met your deductible this year, or will start a new job with coverage soon. Otherwise a Marketplace plan is often much cheaper. The retroactive election means you can hold COBRA as a backup while you compare.' },
      { q: 'How long do I have to sign up on the Marketplace?',
        a: 'Generally 60 days from losing your job-based coverage. Check the date on HealthCare.gov or your state’s marketplace now rather than near the end.' },
      { q: 'Can I get help paying for a Marketplace plan?',
        a: 'Yes. It is based on your expected income for the year. A lower income usually means more help, which is why the price after a layoff can be much lower than people expect.' },
      { q: 'What if I start a new job soon?',
        a: 'Ask the new employer when its coverage starts. If there is a short gap, COBRA’s retroactive window can cover it without paying for months you never use.' },
    ],
  },

  {
    slug: 'should-i-cash-out-my-401k-after-losing-my-job',
    question: 'Should I cash out my 401(k) after losing my job?',
    intro: 'In the US, when the retirement money looks like the only cushion',
    updated: '2026-10-03',
    answer:
      'Usually not first. Cashing out before 59½ is generally taxed as income and usually carries an extra 10% tax, so a large part of it never reaches you. Work out your runway, use unemployment and savings, and treat the 401(k) as a last resort. Rolling it into an IRA keeps it growing until you decide.',
    body: [
      { h: 'What cashing out actually costs',
        p: 'A withdrawal before age 59½ is generally added to your income for the year and taxed, and usually has an additional 10% tax on top. When you cash out directly, the plan usually holds back part of it for tax before you see anything. Between the two, a meaningful share of the balance never reaches you, and the money stops growing for the years you will need it most.' },
      { h: 'The exception people miss: leaving work at 55 or older',
        p: 'If you leave your employer in or after the year you turn 55, withdrawals from that employer’s 401(k) are generally free of the extra 10% tax (they are still taxed as income). It applies to that plan, not to money you have moved into an IRA, so check before you roll anything over.' },
      { h: 'If you have a 401(k) loan, find out the deadline',
        p: 'An outstanding loan from your 401(k) usually has to be repaid after you leave, commonly by your tax filing deadline for that year. If it is not, it is treated as a withdrawal and taxed as one. Ask the plan administrator for the exact date and amount now.' },
      { h: 'What to do with it instead',
        p: 'You can leave it where it is, move it to a new employer’s plan later, or roll it into an IRA. Any of these keeps it tax-deferred. A direct rollover, where the money goes plan to plan, avoids the tax being held back. Rolling over is not spending, and it keeps the choice open.' },
      { h: 'Runway first, retirement money last',
        p: 'Take what has to go out each month and see how many months your savings and severance cover, then add unemployment benefits. Cut the recurring costs in the first week. If the gap is still real, take the smallest withdrawal that closes it, and know the tax on it before you do.' },
    ],
    faqs: [
      { q: 'How much will I actually get if I cash out?',
        a: 'Less than the balance: income tax for the year plus, before 59½, usually an extra 10%. The plan administrator can tell you the withholding; a tax professional can tell you the rest for your situation.' },
      { q: 'Is a rollover to an IRA taxed?',
        a: 'A direct rollover from a 401(k) to a traditional IRA is generally not taxed. Moving it to a Roth IRA is a different decision with tax due. Check before you choose.' },
      { q: 'Can I take just part of it?',
        a: 'Often yes, depending on the plan. A small, planned withdrawal for a specific gap costs far less than cashing out the whole thing.' },
    ],
  },

  {
    slug: 'how-do-i-file-for-unemployment',
    question: 'How do I file for unemployment, and what should I expect?',
    intro: 'In the US, where each state runs its own program',
    updated: '2026-10-03',
    answer:
      'File with your state’s unemployment office in the first week, online if you can: benefits are based on when you file, and delays cost you weeks at the end. Expect to confirm your claim every week or two and show you are looking for work. How much and for how long depends on your state, so read its rules the day you file.',
    body: [
      { h: 'File in the first week',
        p: 'Unemployment insurance is run by each state, so you file with the state where you worked. Most start from the week you file, not the week you lost the job, and some have an unpaid waiting week. Filing late simply loses the weeks in between.' },
      { h: 'What you will need',
        p: 'Your Social Security number, your employers for the last year or so with dates, the reason the job ended, and bank details for payment. Getting the separation reason right matters. Say what happened plainly and keep any letter from your employer.' },
      { h: 'Keep the claim alive',
        p: 'You usually have to confirm every week or two that you are still out of work and looking. Missing a certification can stop payments. Keep a simple log of where you applied and when. States can ask for it.' },
      { h: 'Severance and other pay',
        p: 'In some states, severance or final pay can delay or reduce benefits for a period; in others it does not. That is a reason to file early and let the state decide, not a reason to wait.' },
      { h: 'Plan around it, not on it',
        p: 'Benefits replace only part of your pay and end after a set number of weeks that depends on your state. Count them as part of your runway, and still cut the recurring costs now, because every month they are lower is a month longer you can choose your next job instead of taking the first one.' },
    ],
    faqs: [
      { q: 'Can I get unemployment if I quit?',
        a: 'Usually only for specific reasons your state accepts. If you are thinking about leaving, read your state’s rules first. It can change the order you do things in.' },
      { q: 'How much will I get?',
        a: 'It depends on your state and your earnings over the past year or so, up to a state maximum. Your state’s office will tell you once you file; most have an estimator.' },
      { q: 'What if my claim is denied?',
        a: 'You can appeal, and there is usually a short deadline to do it. Read the reason on the notice and appeal in time even if you are not sure. It is often worth it.' },
    ],
  },

  {
    slug: 'medical-bills-i-cannot-pay',
    question: 'I have medical bills I can’t pay. What do I do first?',
    intro: 'In the US, when the bill arrives after the care',
    updated: '2026-10-03',
    answer:
      'Don’t pay it on a credit card, and don’t ignore it. Ask for an itemized bill and check it, then ask the hospital for its financial assistance policy: nonprofit hospitals must have one, and many people qualify after the bill has already arrived. Most providers will also agree an interest-free payment plan if you ask.',
    body: [
      { h: 'Ask for the itemized bill',
        p: 'A summary bill hides the detail. The itemized version lists every charge, and errors are common: duplicates, services you did not receive, insurance not applied. Compare it with your insurer’s explanation of benefits before you pay anything.' },
      { h: 'Ask about financial assistance, even now',
        p: 'Nonprofit hospitals are required to have a financial assistance policy, and many reduce or forgive bills based on income, often for people who would not think of themselves as low-income. You can usually apply after the bill arrives. Ask the billing office for the policy and the application by name.' },
      { h: 'Negotiate, and ask for a payment plan',
        p: 'Hospitals and providers often reduce a bill for prompt payment of part of it, and most will set up a payment plan with no interest. That beats a credit card or a medical credit card, which can charge interest once a promotional period ends.' },
      { h: 'Keep it from becoming a collection',
        p: 'Talking to the billing office early, and getting any arrangement in writing, keeps the account with the provider rather than a collection agency. Medical debt is treated differently from other debt on credit reports, paid medical collections are removed, and small ones are not reported, but it is still better kept out of collections entirely.' },
      { h: 'Fit it into the month, not on top of it',
        p: 'A payment plan sized to what you have spare each month is a cost you can carry. One sized by the provider’s first offer often is not. Say what you can actually pay, and get that in writing.' },
    ],
    faqs: [
      { q: 'Should I put medical bills on a credit card?',
        a: 'Usually not. Providers commonly offer interest-free payment plans; a credit card turns a bill into debt that grows. Ask for the plan first.' },
      { q: 'Can I apply for financial assistance after I got the bill?',
        a: 'Often yes. Ask the billing office for the financial assistance policy and how long you have to apply, and apply even if you are not sure you qualify.' },
      { q: 'What if it already went to collections?',
        a: 'Ask the collector to verify the debt in writing, check it against your itemized bill, and ask the original provider whether financial assistance can still apply. Do not agree to pay before you know the amount is right.' },
    ],
  },

  {
    slug: 'credit-card-debt-which-to-pay-first',
    question: 'I have debt on several credit cards. Which do I pay first?',
    intro: 'More than one balance, and every payment feels like it disappears',
    updated: '2026-10-03',
    answer:
      'Pay the minimum on every card, then put everything extra on the one with the highest interest rate, that saves the most money. If you need a win to keep going, the smallest balance first is a fair alternative. Either way, stop adding to the cards while you pay them down, or the order does not matter.',
    body: [
      { h: 'The highest rate first saves the most',
        p: 'Interest is what makes the balance grow, so the card charging the most costs you the most every month it stays. Paying minimums everywhere and every extra dollar on the highest-rate card clears the debt for the least total cost. When it is gone, move its payment to the next-highest.' },
      { h: 'The smallest balance first keeps people going',
        p: 'Clearing a small card completely feels like progress, and for some people that is what keeps the plan alive. It costs a little more in interest. A plan you stick to beats a cheaper one you abandon in month three. Choose the one you will actually follow.' },
      { h: 'Find the money to put on it',
        p: 'The order decides where the extra goes; it does not create any. Look at what has to go out each month and what is left. Recurring costs you can cut are worth more than a one-off saving, because every month they free money for the debt.' },
      { h: 'Stop the balances growing',
        p: 'Paying down a card while still spending on it is running on the spot. Take the cards out of your wallet and phone while you pay them down, and keep one emergency option rather than reaching for all of them.' },
      { h: 'When a lower rate genuinely helps',
        p: 'Moving a balance to a lower rate, or a single loan at a lower rate, can help, if the fees are smaller than the interest saved and you do not run the cards back up. Read the fee and the rate after any introductory period before you move anything.' },
    ],
    faqs: [
      { q: 'Should I close cards once they are paid off?',
        a: 'Not necessarily. Closing an old card can affect your credit history. Put it away and stop using it rather than closing it in a hurry.' },
      { q: 'Should I use savings to pay off a card?',
        a: 'Keep a small cushion first, or the next surprise goes straight back on a card at a high rate. Beyond that, clearing high-interest debt is often the best return available.' },
      { q: 'Is a debt consolidation loan a good idea?',
        a: 'It can be, if the rate is genuinely lower, the fees are small, and the cards stay paid off. Compare the total cost, not just the monthly payment.' },
    ],
  },

  // ── Adjacent searches (3 Oct 2026) ─────────────────────────────────────────
  // ⭐ What people type when they are stuck but would never search "a plan to get
  // unstuck": consolidation, moving, quitting, burnout. Each answers honestly first;
  // the free check is offered as the next step, never as the answer. Anything that
  // differs by country says so; no rates, limits or fees that change.
  {
    slug: 'should-i-consolidate-my-debt',
    question: 'Should I consolidate my debt, or just pay it off myself?',
    intro: 'Several debts, and one loan promising to make it simple',
    updated: '2026-10-03',
    answer:
      'Consolidation helps in one situation: when the new rate is genuinely lower, the fees are smaller than the interest you save, and the old cards stay paid off. It does not reduce what you owe. It changes who you owe and at what rate. If the real problem is that more goes out each month than comes in, fix that first or the cards fill up again.',
    body: [
      { h: 'What consolidation actually does',
        p: 'A consolidation loan or balance transfer pays off several debts and leaves you with one. The balance is the same. What can change is the interest rate, the monthly payment and how long you pay. A lower monthly payment over more years can cost more in total, even at a lower rate, so compare the total you will pay, not the payment.' },
      { h: 'When it works',
        p: 'It works when the rate is clearly lower than what you pay now, the fees are small, and you have stopped adding to the debt. Then every payment does more work, and one date is easier to keep than five.' },
      { h: 'When it makes things worse',
        p: 'The common trap is clearing the cards with a loan and then using the cards again. Now there is a loan and new balances. If that has happened before, or if the month does not balance yet, consolidation moves the problem rather than solving it.' },
      { h: 'Doing it yourself costs nothing',
        p: 'Paying minimums on everything and putting every extra dollar on the highest-rate debt gets most of the benefit with no new loan, no fees and no application. Calling your card company to ask for a lower rate is free and sometimes works.' },
      { h: 'Free help exists',
        p: 'Nonprofit credit counselling services can look at your whole situation and may arrange a repayment plan with lower interest. Be wary of any company that charges large fees up front or promises to make debt disappear. Check who regulates them where you live.' },
    ],
    faqs: [
      { q: 'Will consolidating hurt my credit?',
        a: 'Applying can cause a small, temporary dip. Paying on time on one loan and keeping old balances low usually helps over time. Running the cards back up is what really hurts.' },
      { q: 'Is a balance transfer card a good idea?',
        a: 'It can be, if you can clear the balance before the introductory rate ends and the transfer fee is smaller than the interest you save. Read the rate that applies afterwards before you move anything.' },
      { q: 'What if I cannot get a lower rate?',
        a: 'Then consolidation usually is not worth it. Put your effort into the monthly numbers, what goes out and what comes in, and the highest-rate debt first.' },
    ],
  },

  {
    slug: 'debt-settlement-or-bankruptcy',
    question: 'Debt settlement or bankruptcy, which is right for me?',
    intro: 'When paying it back in full no longer looks possible',
    updated: '2026-10-03',
    answer:
      'Before either, find out whether a formal repayment plan through a nonprofit credit counsellor would work. It is often less damaging than both. Settlement and bankruptcy are both real options for some people, but they work differently in every country and carry lasting effects. Get one free or low-cost professional opinion before you sign anything with anyone.',
    body: [
      { h: 'Check the gentler options first',
        p: 'A nonprofit credit counsellor can sometimes arrange lower interest and one monthly payment across your debts. In Canada, a consumer proposal through a licensed insolvency trustee lets you repay part of what you owe in a legally binding plan. These are worth ruling out before anything harder.' },
      { h: 'What settlement means',
        p: 'Settlement is agreeing to pay a creditor less than the full amount. Some settlement companies ask you to stop paying while they negotiate, which can bring late fees, collection calls and damage to your credit, with no guarantee of a deal. In some places forgiven debt can also be taxed. Understand all of that before agreeing.' },
      { h: 'What bankruptcy means',
        p: 'Bankruptcy is a legal process, and the rules are different in every country: what you can keep, what you pay, how long it lasts and how long it shows on your record. It can give a genuine fresh start, and it has lasting effects on borrowing. In Canada it is handled by a licensed insolvency trustee; in the US, people usually speak to a bankruptcy attorney.' },
      { h: 'Be careful who you trust',
        p: 'Promises to make debt disappear, large fees taken up front, or pressure to sign today are warning signs. A first meeting with a licensed trustee or a nonprofit counsellor is commonly free and explains your options without selling you one.' },
      { h: 'The numbers still decide it',
        p: 'Whatever you choose, it has to work against what comes in and what has to go out each month. Knowing that number before the meeting makes the conversation faster and the advice better.' },
    ],
    faqs: [
      { q: 'Will I lose my house if I go bankrupt?',
        a: 'It depends entirely on where you live, your equity and the rules there. This is exactly the question to ask a licensed professional before deciding.' },
      { q: 'Are debt settlement companies legitimate?',
        a: 'Some are and some are not. Check who regulates them where you live, avoid large up-front fees, and get a free opinion from a nonprofit or licensed trustee first.' },
      { q: 'How long does it affect my credit?',
        a: 'Years, in both cases, and the length depends on the country and the process. Ask the professional you speak to for the specifics where you live.' },
    ],
  },

  {
    slug: 'behind-on-my-car-payments',
    question: 'I’m behind on my car payments. What do I do?',
    intro: 'A missed payment, and the car is how you get to work',
    updated: '2026-10-03',
    answer:
      'Call the lender before the next payment is due, not after. Lenders usually have options, moving a payment to the end of the loan, a short deferral, a new schedule, and they are far more flexible before a car is repossessed than after. If the car costs more than you can carry for the long term, selling it yourself is usually better than waiting.',
    body: [
      { h: 'Call first',
        p: 'It feels like the worst call to make, and it is the one that keeps the most options open. Ask what they can offer: deferring a payment, adding missed payments to the end of the loan, or changing the due date to match your pay. Get any arrangement in writing.' },
      { h: 'Know whether this is a short gap or a long one',
        p: 'A one-month shortfall from a surprise bill is different from a payment that no longer fits your month. A deferral fixes the first. The second needs either more coming in, less going out somewhere else, or a cheaper car.' },
      { h: 'Selling it yourself beats repossession',
        p: 'If you owe less than the car is worth, selling it privately clears the loan and may leave money over. If you owe more, you may need to cover the difference: still often cheaper than repossession, which adds fees and usually sells the car for less. Ask the lender for the payoff amount and look up what similar cars sell for.' },
      { h: 'Protect getting to work',
        p: 'If the car is how you earn, losing it can cost more than the payment. Line up what replaces it, a cheaper car, a ride, transit, before you let it go, so the job is not the next thing at risk.' },
    ],
    faqs: [
      { q: 'How many missed payments before they repossess?',
        a: 'It depends on your contract and where you live. In some places it can be soon after a missed payment. Read your agreement and call the lender rather than waiting to find out.' },
      { q: 'Should I refinance?',
        a: 'It can help if you can get a genuinely lower rate. Stretching the loan to lower the payment usually costs more in total, so compare the full cost.' },
      { q: 'Can I give the car back voluntarily?',
        a: 'Usually, but you may still owe the difference between what you owed and what it sells for. Selling it yourself often gets a better price.' },
    ],
  },

  {
    slug: 'moving-to-a-cheaper-city',
    question: 'Should I move somewhere cheaper to get ahead?',
    intro: 'Rent eats everything, and somewhere else looks easier',
    updated: '2026-10-03',
    answer:
      'It works when the move lowers what goes out by more than it lowers what comes in. Cheaper housing helps only if the income comes with you: remote work, an in-demand trade, or a job lined up before you go. Count the full cost of moving and the first few months, not just the rent.',
    body: [
      { h: 'Compare the whole month, not the rent',
        p: 'Housing is usually the biggest number, but a cheaper place can mean a car you did not need, longer drives, higher heating or insurance, or lower pay. Write out a month in both places, what comes in and what has to go out, and compare what is left.' },
      { h: 'The income question decides it',
        p: 'If your work can come with you, a lower cost of living can change everything. If it cannot, check what your work actually pays there. Moving first and job-hunting second turns savings into the thing you live on while you look.' },
      { h: 'Count the cost of getting there',
        p: 'Movers or a truck, deposits, the overlap of two rents, connecting services, time off work. These come out of savings all at once. A move that saves a few hundred a month can take a year to pay back.' },
      { h: 'What you leave behind has a value too',
        p: 'Family nearby who help with children, friends, a church or community you rely on. These do work that costs money to replace. They are not reasons not to move; they belong in the comparison.' },
      { h: 'Try it before you commit',
        p: 'If you can, spend time there first, line up the work, and rent before you buy. A move you can undo is less risky than one you cannot.' },
    ],
    faqs: [
      { q: 'How much should I save before moving?',
        a: 'Enough to cover the move itself plus a few months of what has to go out in the new place. More if you do not have work lined up there.' },
      { q: 'Is moving with no savings a bad idea?',
        a: 'It is risky unless the income is certain and starts quickly. If you must, line up the job and the housing first so you are not paying for both a search and a move.' },
      { q: 'Should I move to another country?',
        a: 'The same comparison applies, plus work permits, health coverage, taxes and currency. Each is a real cost. Check them before deciding.' },
    ],
  },

  {
    slug: 'moving-back-home-to-save-money',
    question: 'Should I move back in with my parents to save money?',
    intro: 'Rent is the biggest bill, and home is an option',
    updated: '2026-10-03',
    answer:
      'It can be one of the fastest ways to get ahead, if it has an end date and a target. Decide before you move what the money is for, how much you will put aside each month, and roughly when you will leave. Without that, the savings tend to disappear into everyday spending and the stay drifts on.',
    body: [
      { h: 'Give it a purpose and a number',
        p: 'Clearing a debt, building a deposit, a cushion before a career change. Name it, work out what you can put toward it each month, and you will know roughly how long you need to stay. That turns a step back into a plan.' },
      { h: 'Agree the arrangement out loud',
        p: 'Rent or no rent, what you cover, what you help with, how long. Saying it at the start avoids most of the tension that comes later. Paying something, even a little, often makes it feel fairer on both sides.' },
      { h: 'Protect the saving',
        p: 'Move the amount you agreed into a separate account on payday, before you can spend it. The common failure is that rent stops and spending quietly rises to fill the gap.' },
      { h: 'Watch the cost you cannot see',
        p: 'A longer commute, less independence, strain on relationships. These are real. A clear end date makes them easier to carry.' },
    ],
    faqs: [
      { q: 'How long should I stay?',
        a: 'As long as it takes to reach the target you set, and say that date out loud at the start, so everyone knows what to expect.' },
      { q: 'Should I pay my parents rent?',
        a: 'Often, yes, even a small amount. It keeps the arrangement fair and the habit of paying for housing alive. What matters most is agreeing it clearly.' },
      { q: 'Is it embarrassing at my age?',
        a: 'Plenty of people do it, at many ages, for good reasons. Moving out with a debt cleared or a deposit saved is a strong place to move out from.' },
    ],
  },

  {
    slug: 'career-change-at-40',
    question: 'Is it too late to change careers at 40?',
    intro: 'Twenty years in, and the work no longer fits',
    updated: '2026-10-03',
    answer:
      'No, but the money has to be planned, because the change usually comes with a pay dip before it recovers. Work out how long you can carry a lower income, then pick a path that fits inside that time. Use what you already know; the most realistic changes reuse your experience rather than starting from zero.',
    body: [
      { h: 'Plan for the dip',
        p: 'A new field often pays less at first. Work out what has to go out each month and how long savings, a partner’s income or part-time work can cover the gap. That number tells you whether you need a quick change or can afford a longer retraining.' },
      { h: 'Your experience is not starting over',
        p: 'Twenty years of work brings skills that carry: managing people, dealing with customers, knowing an industry from the inside. The changes that work best usually move sideways into something that uses them, rather than to something with no connection at all.' },
      { h: 'Test before you leap',
        p: 'Talk to people already doing the work. Try it on the side, volunteer, take a short course before a long one. Finding out it is not for you costs far less this way.' },
      { h: 'Retraining is an investment only if it opens a door',
        p: 'A qualification that a named employer or a licence requires is worth paying for. One bought to feel like progress is an expense in the year you can least afford it. Be specific about which job it leads to.' },
      { h: 'Keep the income going while you can',
        p: 'Leaving before the new path pays is the riskiest order. Reducing hours, retraining evenings or moving to the new work in steps keeps you choosing rather than scrambling.' },
    ],
    faqs: [
      { q: 'Will I have to take a big pay cut?',
        a: 'Often a temporary one, depending on the field and how much of your experience carries over. Plan for it rather than hoping it will not happen.' },
      { q: 'Should I go back to school?',
        a: 'Only if the qualification is required for the work you want. Check job postings and ask people in the field before enrolling.' },
      { q: 'What if my family depends on my income?',
        a: 'Then the change happens in steps, not one leap. The plan starts with how long the household can manage on less.' },
    ],
  },

  {
    slug: 'can-i-afford-to-go-part-time',
    question: 'Can I afford to go part-time?',
    intro: 'Less work, if the numbers allow it',
    updated: '2026-10-03',
    answer:
      'Work it out on what you would actually take home, not your hourly rate. Fewer hours often means less tax too, and some costs fall, childcare, commuting, so the gap can be smaller than it looks. Check what you would lose besides pay, such as benefits, health coverage or pension contributions, before you ask.',
    body: [
      { h: 'Use take-home pay, not the headline',
        p: 'Going from five days to four does not usually cut your take-home pay by exactly a fifth. Tax often falls a little faster. Ask your payroll or use a pay calculator for where you live to see the real number.' },
      { h: 'Some costs fall with the hours',
        p: 'Childcare, commuting, lunches, the convenience spending that comes from being busy. Add them up; they can close more of the gap than people expect.' },
      { h: 'Check what is tied to full-time',
        p: 'Health coverage, benefits, pension or retirement matching, paid leave and eligibility for some programs can depend on hours. In some countries this matters far more than in others. Find out before you agree to anything.' },
      { h: 'Compare the month, then decide',
        p: 'Write down what comes in now and what would come in part-time, and what has to go out in each case. If there is still room, it is affordable. If not, you know exactly how much needs to change elsewhere.' },
    ],
    faqs: [
      { q: 'How do I ask my employer?',
        a: 'Bring a specific proposal, which days, how the work gets covered, when it starts, and offer a trial period. A clear plan is easier to say yes to.' },
      { q: 'Will it affect my retirement savings?',
        a: 'Often a little, because contributions are usually a share of pay. Check whether any employer matching changes too.' },
      { q: 'What if it does not work out?',
        a: 'Ask whether you can return to full-time, and get it in writing if you can. A trial period helps both sides.' },
    ],
  },

  {
    slug: 'burned-out-and-cannot-afford-a-break',
    question: 'I’m burned out but I can’t afford to stop working. What do I do?',
    intro: 'Exhausted, and the bills still come',
    updated: '2026-10-03',
    answer:
      'Start by finding out what rest you can get without losing income: sick leave, unused holiday, a short leave or reduced hours. Then look at the month: even a small cut in what has to go out can buy room to work less. And if exhaustion is affecting your health, see a doctor; it is a health problem, not only a money one.',
    body: [
      { h: 'Check what you are already entitled to',
        p: 'Unused holiday, sick days, a short-term leave program, an employee assistance service. Many people burn out with time off they never took. Read your contract or ask HR quietly what exists.' },
      { h: 'Talk to a doctor',
        p: 'Burnout can affect sleep, mood and physical health, and a doctor can help, and in some places can support time off or reduced duties. If you ever feel unsafe, contact a crisis line in your country right away.' },
      { h: 'Make the month lighter',
        p: 'The less that has to go out, the less you have to earn to be safe. Cutting a few recurring costs can make fewer hours, or a short unpaid break, possible. Every cost removed works every month.' },
      { h: 'Change the work, not just the hours',
        p: 'Sometimes the drain is one part of the job: nights, a commute, a role. Asking for a different shift or a change of duties can help more than time off, and costs nothing.' },
      { h: 'Plan the way out, even slowly',
        p: 'If the job itself is the problem, a plan with a date, even months away, makes the meantime easier to carry. Feeling stuck is part of what wears people down.' },
    ],
    faqs: [
      { q: 'Can I take time off for burnout?',
        a: 'It depends on your country, employer and situation. A doctor and your HR department are the people to ask.' },
      { q: 'Should I just quit?',
        a: 'Not before you know how many months you can cover what has to go out. Quitting with no runway can swap one kind of stress for another.' },
      { q: 'How do I know it is burnout and not something else?',
        a: 'A doctor can help tell the difference. That conversation is worth having either way.' },
    ],
  },

  {
    slug: 'starting-over-financially-at-40',
    question: 'I’m 40 with nothing saved. How do I start over?',
    intro: 'Behind where you thought you would be',
    updated: '2026-10-03',
    answer:
      'Begin with the month, not the decades. Know what comes in and what has to go out, make a small gap between them, and point that gap at one thing at a time: a cushion first, then expensive debt, then retirement. Twenty-five working years is long enough for steady saving to add up to a great deal.',
    body: [
      { h: 'The month comes first',
        p: 'Every plan runs on what is left at the end of the month. Write down what comes in and what has to go out. If nothing is left, that is the first problem to solve, more in, or less out, and it is worth solving before anything else.' },
      { h: 'A small cushion before anything else',
        p: 'A little money set aside stops the next surprise going onto a card. It does not need to be large to start. It is what makes the rest of the plan survive real life.' },
      { h: 'Then the expensive debt',
        p: 'High-interest debt grows faster than most savings do. Clearing it is often the best return available, and it frees money every month once it is gone.' },
      { h: 'Then the long term, and do not skip the free money',
        p: 'Retirement saving through work, especially where an employer matches what you put in, is worth starting early in the plan, because matching is money you lose by waiting. The accounts differ by country; the principle does not.' },
      { h: 'Forty is not late for this',
        p: 'Steady saving over twenty-five years, with typical long-term returns, can grow to far more than what you put in. Returns vary and are never guaranteed, but time does a lot of the work. Starting now matters more than starting perfectly.' },
    ],
    faqs: [
      { q: 'How much should I save each month?',
        a: 'Whatever the month allows, consistently. A regular amount you keep up beats a big amount you stop after two months.' },
      { q: 'Should I pay off debt or save first?',
        a: 'A small cushion first, then expensive debt, then longer-term saving, while not giving up any employer match.' },
      { q: 'Is it too late to buy a home?',
        a: 'Not necessarily. It depends on where you live and your income. Get the month working first; a deposit is built from the same gap.' },
    ],
  },

  {
    slug: 'should-we-downsize-our-house',
    question: 'Should we downsize our house to free up money?',
    intro: 'More house than you need, and less money than you want',
    updated: '2026-10-03',
    answer:
      'Downsizing works when the smaller home costs clearly less each month and the move releases money you have a plan for. Count every cost of selling and buying, agents, legal fees, taxes, moving, and compare the month in each home. Decide what the freed money is for before you sell, or it tends to drift away.',
    body: [
      { h: 'Compare the month, not just the price',
        p: 'A smaller home can mean a smaller mortgage or rent, lower taxes, lower heating and upkeep. It can also mean a new area with different costs. Write out what has to go out each month in both and compare what is left.' },
      { h: 'Selling and buying cost more than people expect',
        p: 'Agent fees, legal fees, transfer or stamp taxes depending on where you live, moving and setting up. Add them up. They come off the money the move frees, and they can be large.' },
      { h: 'Know what the money is for',
        p: 'Clearing debt, building a retirement cushion, helping family, buying time to work less. Name it before you sell. Money released without a purpose is often spent within a few years.' },
      { h: 'The things that are not money',
        p: 'Room for family to visit, a garden, a neighbourhood you love. These matter and they belong in the decision alongside the numbers.' },
      { h: 'Timing and tax',
        p: 'Whether you buy before you sell, and how any gain on the sale is taxed where you live, both change the numbers. A short conversation with a professional is worth it on a decision this size.' },
    ],
    faqs: [
      { q: 'Is it better to rent after selling?',
        a: 'For some people, yes. It frees the most money and keeps options open. It also means rent that can rise. Compare both over several years.' },
      { q: 'When is the best time to downsize?',
        a: 'When the numbers work and you know what the freed money is for. Not because of a guess about the market.' },
      { q: 'Will I pay tax when I sell my home?',
        a: 'It depends on your country and your situation. Many places treat a main home differently from other property. Check with a tax professional before you sell.' },
    ],
  },
  // ── Starting out, and owners stuck as people (3 Oct 2026) ──────────────────
  // ⭐ Someone deciding whether to start is a PERSON deciding — Unstuck's job.
  // Once a business is running, the pages carry a `bridge` to Eliv8 OS for the
  // business side (see BRIDGE_TO_ELIV8). Not on the "should I quit" page: they
  // are not ready for it there, and pointing at it would be a push.
  {
    slug: 'should-i-quit-my-job-to-start-a-business',
    question: 'Should I quit my job to start a business?',
    intro: 'An idea that will not go away, and a paycheque that pays the bills',
    updated: '2026-10-03',
    answer:
      'Usually not first. Start it alongside the job until it has paying customers, and know how many months your savings cover what has to go out before you leave. The question is rarely whether the idea is good. It is whether you can carry the months before it pays, and that is a number you can work out.',
    body: [
      { h: 'Runway decides the timing',
        p: 'Take what has to go out each month and divide what you have saved by it. That is how many months you can go without income. New businesses usually take longer to pay than planned, so the honest runway is the one with a margin built in.' },
      { h: 'Paying customers are the real test',
        p: 'Interest, compliments and sign-ups are encouraging; payment is proof. A handful of people paying a real price, while you still have the job, tells you more than any plan.' },
      { h: 'Leave when the business pulls you, not when the job pushes you',
        p: 'A job you hate makes quitting feel urgent. A business with more demand than your evenings can handle makes it necessary. The second is the safer reason to go.' },
      { h: 'Talk to the people it affects',
        p: 'A partner, a household, anyone who depends on the income. Agree on the runway and the point at which you would go back to a job. That agreement makes the risk shared rather than hidden.' },
      { h: 'Check your current job’s rules',
        p: 'Some employment agreements limit side work or competing businesses. Read yours before you start, so the business does not begin with a problem.' },
    ],
    faqs: [
      { q: 'How much should I save before quitting?', a: 'Enough to cover what has to go out for at least as long as you expect the business to take to pay, and then some, because it usually takes longer.' },
      { q: 'What if I never feel ready?', a: 'Ready is a number, not a feeling: paying customers and a runway you have counted. When both are there, the decision gets much easier.' },
      { q: 'Can I go part-time instead of quitting?', a: 'Often a good middle step. Fewer hours at the job buys time for the business without giving up all the income.' },
    ],
  },
  {
    slug: 'how-to-start-a-business-while-working-full-time',
    question: 'How do I start a business while working full-time?',
    intro: 'Evenings and weekends, and a job that still needs you',
    updated: '2026-10-03',
    answer:
      'Pick the smallest version that can earn money, give it fixed hours each week, and protect the job while you build it. Most businesses started this way grow slowly at first, and that is fine. The job is what lets you take your time and get the price right.',
    body: [
      { h: 'Start with the smallest paying version',
        p: 'One service, one product, one kind of customer. The aim of the first months is to find out whether people will pay, not to build everything. A small thing that earns teaches more than a big thing that is not finished.' },
      { h: 'Give it fixed hours',
        p: 'A few set evenings or a weekend morning, every week. Work squeezed into whatever time is left disappears. Fixed hours also protect the rest of your life from it.' },
      { h: 'Price it as if it were your only income',
        p: 'A job in the background makes it tempting to charge too little. Prices set low at the start are hard to raise later, and they make the business look viable when it is not.' },
      { h: 'Keep the money separate from day one',
        p: 'A separate account, records of what comes in and goes out, and money set aside for tax on what it earns. It makes the business easy to understand and saves a painful year-end.' },
      { h: 'Protect the job',
        p: 'Do not use your employer’s time, tools or customers, and check your agreement for limits on side work. The job is what makes this possible.' },
    ],
    faqs: [
      { q: 'How many hours a week does it take?', a: 'It depends on the business, but a steady few hours each week beats occasional long bursts. Consistency is what moves it forward.' },
      { q: 'Do I need to register the business?', a: 'Often, depending on where you live and what you sell, and you may need to report the income for tax. Check your local rules early.' },
      { q: 'When will I know it is working?', a: 'When people pay a fair price without being chased, and come back or send others. That is the sign it can grow.' },
    ],
  },
  {
    slug: 'my-business-is-taking-over-my-life',
    question: 'My business is taking over my life. What do I do?',
    intro: 'It pays the bills, and it has everything else too',
    updated: '2026-10-03',
    answer:
      'Decide what you want the business to give your life, a certain income, certain hours, time with the people you love, and then judge every change against that. A business with no limit set will take all the time it is given. Getting your life back usually starts with one fixed boundary and one thing you stop doing yourself.',
    body: [
      { h: 'Name what the business is for',
        p: 'Not the revenue target, what it is meant to make possible. Evenings home, a certain income, freedom to choose your work. Without that, more work always looks like the right answer.' },
      { h: 'Set one boundary and keep it',
        p: 'A day off, a time the phone goes down, a kind of job you no longer take. One kept boundary changes more than five intentions. Customers usually adjust faster than owners expect.' },
      { h: 'Your own money matters too',
        p: 'If the business takes everything and pays you little, look at your personal side: what your household needs each month and what you are actually taking home. That number tells you how much room you have to change things.' },
      { h: 'Stop doing one thing yourself',
        p: 'The task that eats the most hours and does not need you: scheduling, invoicing, a kind of job someone else could run. Handing off one thing is where the time comes back from.' },
    ],
    faqs: [
      { q: 'Should I close the business?', a: 'Sometimes that is the right answer, but often the business can change shape first: fewer hours, a narrower offer, higher prices. Try those before deciding.' },
      { q: 'How do I take time off when everything depends on me?', a: 'Start small, one protected day, and decide in advance who handles what. Most things that feel like emergencies can wait a day.' },
      { q: 'Is it normal to feel this way?', a: 'Very. Many owners reach this point. Feeling it is a sign the business has grown past the way it is run, not that you have failed.' },
    ],
  },
  {
    slug: 'should-i-close-my-business',
    question: 'Should I close my business?',
    intro: 'Years of work, and you are not sure it is worth it any more',
    updated: '2026-10-03',
    answer:
      'Look at three things honestly: whether it pays you a fair income for the hours, whether it can with changes you are willing to make, and what you want your life to look like next. Closing is a real option and not a failure. Decide it on numbers and on what you want, not in the worst week of the year.',
    body: [
      { h: 'What does it actually pay you?',
        p: 'Take what you draw from the business in a year and divide it by the hours you work. Compare that with what you could earn in a job. Many owners have never done this sum, and it changes the conversation either way.' },
      { h: 'Can it change, and do you want to change it?',
        p: 'Higher prices, a narrower offer, fewer hours, a key hire. Sometimes a business is one or two changes from working. Sometimes the changes are possible but you do not want to make them, that is a valid answer too.' },
      { h: 'Closing well protects you',
        p: 'Finishing commitments, paying what is owed, dealing with leases, staff and the government properly. How a business is closed affects your finances and reputation afterwards. An accountant and sometimes a lawyer are worth involving.' },
      { h: 'Selling or handing over instead',
        p: 'A business with steady customers may have value to someone else: a competitor, an employee, a buyer. That is worth checking before simply closing.' },
      { h: 'Plan the next income first',
        p: 'Know what comes after, a job, a smaller version, something new, and how many months you can cover in between. Closing with the next step lined up is far less stressful.' },
    ],
    faqs: [
      { q: 'Is closing my business a failure?', a: 'No. Choosing to stop something that no longer serves your life is a decision, and often a good one.' },
      { q: 'What happens to business debt if I close?', a: 'It depends on how the business is set up and where you live. Some debts may follow you personally. Get professional advice before closing.' },
      { q: 'Should I try one more year?', a: 'If you can name what would be different this year and you can afford the runway, maybe. If nothing would change, another year usually looks like the last one.' },
    ],
  },
  // ── Stuck, plainly (6 Oct 2026) ─────────────────────────────────────────────
  // ⭐ The teardown found "feeling stuck" answered by gratitude-journal blogs and
  // the money questions owned by companies selling the answer. These answer
  // plainly, with an order. Drafts approved by Daniel ("I think it's good").
  // ⚠️ No dashes in any of this copy (his rule). The Baby Steps are quoted from
  // ramseysolutions.com as of 6 Oct 2026 and described fairly.
  {
    slug: 'i-feel-stuck-in-life-where-do-i-start',
    question: 'I feel stuck in life. Where do I even start?',
    intro: 'When every day looks the same and nothing seems to move',
    updated: '2026-10-06',
    answer:
      'Start by writing down what you want an ordinary day to look like a year from now, then the one thing standing most in the way of it. Feeling stuck is rarely a lack of ideas. It is usually too many options and no order. One clear first step, chosen on purpose, does more than another list of goals.',
    body: [
      { h: 'Stuck usually means no order, not no options',
        p: 'Most people who feel stuck already know several things they could change. The weight comes from not knowing which one goes first, so nothing moves, and every option stays open and unfinished.' },
      { h: 'Name the life, not the goal',
        p: '“Be happier” cannot be planned. “Home by six, with a bit left at the end of the month” can. The more ordinary and specific the picture, the easier the first step is to see.' },
      { h: 'Find what is actually holding it in place',
        p: 'Often it is money: what has to go out every month, a debt, a job that pays the bills. Sometimes it is a person, a place or a commitment you cannot move yet. Writing these down turns a feeling into something you can work with.' },
      { h: 'One move, then the next',
        p: 'Big changes go wrong when they all start at once. Pick the move that unlocks the others, and decide what has to be true before you take the next one. That one fact is what tells you it is time to move on.' },
      { h: 'Small and finished beats big and started',
        p: 'A move you complete changes how the next one feels. Choose a first step you can actually finish in the next few weeks, even if it is not the most important one on the list.' },
    ],
    faqs: [
      { q: 'Is feeling stuck normal?',
        a: 'Very. It often arrives after a stretch of hard work, a change at home, or simply years of the same routine. It is a sign something needs to change, not a sign something is wrong with you.' },
      { q: 'What if I do not know what I want?',
        a: 'Start with what you do not want to keep. A clear “not this” is often the first honest step toward knowing what you want instead.' },
      { q: 'Should I make a big change or a small one?',
        a: 'Usually the smallest change that opens the door to the next one. Big changes are easier once the first move is behind you and you know what it cost.' },
    ],
  },
  {
    slug: 'stuck-in-a-job-i-hate-with-bills-to-pay',
    question: 'I am stuck in a job I hate, but I have bills to pay. What do I do?',
    intro: 'The paycheque keeps you there, and so does everything it pays for',
    updated: '2026-10-06',
    answer:
      'Work out the number your life actually needs each month, not your current salary. That number decides how much freedom you really have. Then build the way out while the job still pays, so leaving is a decision you make, not a jump you hope works.',
    body: [
      { h: 'The number that matters is smaller than your pay',
        p: 'What has to go out each month is usually less than what you earn, and some costs leave with the job: commuting, lunches, the convenience spending that comes from being worn out. Knowing the real number often shows more room than you expected.' },
      { h: 'Count your runway',
        p: 'Divide what you have saved by what has to go out each month. That is how many months you could cover. It turns “I can’t leave” into “I could leave in eight months if I do these three things.”' },
      { h: 'Build the exit from inside the job',
        p: 'Test the next thing on evenings or weekends, apply quietly, or ask to change your hours or role. A job you dislike is easier to carry when you know it has an end date.' },
      { h: 'Lower what has to go out',
        p: 'Every recurring cost you remove makes the next job possible sooner, including one that pays less but fits your life. A cut that repeats every month is worth far more than a one time saving.' },
      { h: 'Decide what would have to be true',
        p: 'Write down the facts that would let you leave with confidence: a number saved, an offer in hand, a few paying customers. When they are true, you go. Until then, the job is paying for your way out.' },
    ],
    faqs: [
      { q: 'Should I quit without another job lined up?',
        a: 'Only if your runway comfortably covers a longer search than you expect, or staying is harming your health. Otherwise, searching from inside a job gives you more choice and a stronger position.' },
      { q: 'What if the job I want pays less?',
        a: 'Compare it with what your life actually needs each month, not with your current salary. If it covers that with something left over, it may be more affordable than it looks.' },
      { q: 'How do I keep going in a job I am leaving?',
        a: 'Give it a date and a reason. Knowing exactly what the job is paying for, and when it ends, makes the days in between easier to carry.' },
    ],
  },
  {
    slug: 'dave-ramsey-baby-steps-do-they-fit-me',
    question: 'Dave Ramsey’s Baby Steps: do they fit my situation?',
    intro: 'A clear order millions have followed, and when a different one fits',
    updated: '2026-10-06',
    answer:
      'The Baby Steps give a simple order: a $1,000 starter emergency fund, then all debt except the house using the debt snowball, then three to six months of expenses saved, then investing. That clarity is their strength. Where your situation differs, like an unsteady income, an employer match or very high interest on one debt, a different order can fit you better.',
    body: [
      { h: 'What the Baby Steps get right',
        p: 'One thing at a time, in order, with a starting point almost anyone can reach. For many people the momentum of clearing small debts first is exactly what keeps them going, and a plan you stick to beats a cleverer one you abandon.' },
      { h: 'An unsteady income may need a bigger cushion first',
        p: 'If your work is seasonal or uncertain, $1,000 can disappear in one slow month. A larger cushion before attacking debt can stop you landing back on a credit card.' },
      { h: 'Check what pausing an employer match costs',
        p: 'During Step 2 the Baby Steps pause retirement investing. If your employer matches what you put in, find out how much that match is worth before you pause it.' },
      { h: 'One very expensive debt changes the maths',
        p: 'The debt snowball pays the smallest balance first. Paying the highest interest rate first usually costs less in total. Both work if you keep going, so choose the one you will actually follow.' },
      { h: 'What the steps do not ask',
        p: 'The Baby Steps are an order for money. They do not ask what you want your life to look like, or what a change of work, home or hours would do to the plan. That is the question a plan here starts with.' },
    ],
    faqs: [
      { q: 'Is the debt snowball or the avalanche better?',
        a: 'The avalanche, highest rate first, usually saves more money. The snowball, smallest balance first, gives quicker wins. The better one is whichever you will stick with.' },
      { q: 'Should I stop my retirement contributions to pay off debt?',
        a: 'Check whether your employer matches contributions first. Losing a match is giving up money you would otherwise receive. Many people keep at least enough to get the full match.' },
      { q: 'Do the Baby Steps work in Canada?',
        a: 'The order works anywhere. The accounts differ: in Canada you would look at an RRSP or TFSA rather than a 401(k), and a workplace pension or group plan may have its own match.' },
    ],
  },
]

export const SITUATION_BY_SLUG = Object.fromEntries(SITUATIONS.map(s => [s.slug, s]))