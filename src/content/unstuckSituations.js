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
]

export const SITUATION_BY_SLUG = Object.fromEntries(SITUATIONS.map(s => [s.slug, s]))
