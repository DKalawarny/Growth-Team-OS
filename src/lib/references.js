/**
 * Curated reference canon for Solomon.
 *
 * Same reasoning as `regulatory_sources` (migration 022): a model asked to
 * recall books from training data will misattribute ideas, invent chapters,
 * and fabricate quotations with total confidence. So Solomon does not
 * reference books from memory — he references THIS list, and nothing else.
 *
 * The original 13 rows were checked against publisher and bookseller listings on
 * 2026-08-20 — titles and authorship confirmed. Two were corrected in that
 * pass: Every Good Endeavor is co-authored with Katherine Leary Alsdorf, and
 * the expanded Great Game of Business is credited with Bo Burlingham.
 *
 * ⚠️ Anything ADDED later must be verified the same way. Never add a title
 * from memory — that is the exact failure this file exists to prevent.
 * Daniel: these are verified as real, but whether you want the product
 * associated with each is a separate judgement that is yours to make.
 *
 * Rules enforced in the prompt, not here:
 *   - never quote from any of these
 *   - never cite a page, chapter, or section
 *   - describe the idea in plain words and attribute only the general thesis
 *   - at most one book per reply, and only where it genuinely fits
 */

/**
 * ⭐ 11 Oct 2026 — the list grew from 13 to 31, and each book now carries the
 * SIGNALS that make it relevant.
 *
 * Daniel: "I want them to come up when it applies... we can set a type of
 * algorithm that promotes these books when it applies. Is there really no more
 * we can add, what about business and family and time management with family."
 * He had asked for books on how staff are treated once before (31 Aug) and the
 * verification pass was never done.
 *
 * Every title and author added here was checked against publisher, library or
 * bookseller listings on 2026-10-11. The rule above stands: verify, then add.
 *
 * Fields:
 *   topic    the area of the business the book speaks to
 *   fits     the situation, for Solomon (goes in his context)
 *   because  the same thing said to the owner in a few words, shown beside the
 *            book when the matcher surfaces it (lib/bookMatch.js)
 *   signals  words and phrases that, found in a result or a milestone, mean the
 *            situation is present. A book needs TWO different signals to be
 *            shown, so one stray word never summons a book.
 */
export const REFERENCE_BOOKS = [
  // ── Operating the business ──────────────────────────────────────────────
  { title: 'The E-Myth Revisited', author: 'Michael E. Gerber', topic: 'process',
    fits: 'Owner is the bottleneck; work is in their head rather than written down. Pairs with SOPs.',
    because: 'for when the work lives in your head instead of on paper',
    signals: ['in your head', 'in his head', 'bottleneck', 'written down', 'document', 'sop', 'procedure', 'depends on you', 'without you', 'only you know', 'the same way'] },
  { title: 'Traction', author: 'Gino Wickman', topic: 'operating-rhythm',
    fits: 'No cadence, no clear quarterly priorities. Pairs with the quarterly priorities on the Roadmap.',
    because: 'for setting a few priorities each quarter and actually finishing them',
    signals: ['quarter', 'priorit', 'rhythm', 'cadence', 'weekly meeting', 'accountab', 'rocks', 'too many goals'] },
  { title: 'Rocket Fuel', author: 'Gino Wickman and Mark C. Winters', topic: 'second-in-command',
    fits: 'Owner needs someone to run the day to day so he can step back. The visionary and the person who makes it happen.',
    because: 'for handing the day to day to someone who runs it while you lead',
    signals: ['second in command', 'crew lead', 'operations manager', 'general manager', 'step back', 'stepping back', 'runs the day', 'run the business', 'integrator', 'right hand'] },
  { title: 'Who', author: 'Geoff Smart and Randy Street', topic: 'hiring',
    fits: 'Hiring on gut feel, repeated bad hires. Pairs with the hiring planner.',
    because: 'for hiring on evidence instead of a good feeling',
    signals: ['hire', 'hiring', 'recruit', 'candidate', 'interview', 'bad hire', 'new role', 'scorecard'] },
  { title: 'Buy Back Your Time', author: 'Dan Martell', topic: 'delegation',
    fits: 'Owner working far past their own stated ceiling and unable to hand work off.',
    because: 'for getting your own hours back by handing work off properly',
    signals: ['delegat', 'hand off', 'hand it off', 'hours a week', 'too many hours', 'your time', 'off the tools', 'doing it all', 'still on site'] },
  { title: 'Essentialism', author: 'Greg McKeown', topic: 'focus',
    fits: 'Owner is spread across too many things and saying yes to all of them.',
    because: 'for doing fewer things and doing them properly',
    signals: ['too many', 'too much', 'spread thin', 'overcommit', 'say no', 'saying yes', 'focus', 'priorit', 'stretched'] },

  // Added on Daniel's word, 11 Oct ("tony is fine, everyone accepts him"), after
  // I had left it out over the subtitle. Shown by title only, and only for the
  // owner's own follow-through, never for money.
  { title: 'Awaken the Giant Within', author: 'Tony Robbins', topic: 'follow-through',
    fits: 'Owner knows what needs doing and keeps not doing it. The gap is habit and decision, not information.',
    because: 'for closing the gap between knowing what to do and doing it',
    signals: ['keep putting off', 'putting it off', 'procrastinat', 'not following through', 'follow through', 'habit', 'discipline', 'motivat', 'stuck', 'avoid', 'keeps slipping', 'said he would'] },

  // ── Money ───────────────────────────────────────────────────────────────
  { title: 'Profit First', author: 'Mike Michalowicz', topic: 'cash',
    fits: 'Revenue growing while the bank balance does not. Chronic cash anxiety.',
    because: 'for making sure profit, and your own pay, is not just whatever is left over',
    signals: ['cash', 'bank balance', 'profit', 'owner pay', 'margin', 'tight week', 'payroll week', 'line of credit'] },
  { title: 'The Great Game of Business', author: 'Jack Stack with Bo Burlingham', topic: 'open-book',
    fits: 'Team disengaged from the numbers; owner carrying financial pressure alone.',
    because: 'for letting the team see the numbers and share the weight',
    signals: ['open book', 'the numbers with', 'team knows the numbers', 'carrying it alone', 'bonus', 'crew understand', 'share the numbers', 'engaged'] },
  { title: 'Built to Sell', author: 'John Warrillow', topic: 'succession',
    fits: 'Business cannot run without the owner. Pairs with Succession.',
    because: 'for building a business that runs, and could sell, without you',
    signals: ['sell', 'exit', 'succession', 'buyer', 'hand it on', 'hand on', 'runs without you', 'recurring revenue', 'sellab'] },
  { title: "Every Family's Business", author: 'Thomas William Deans', topic: 'family-succession',
    fits: 'A family member is in the business or expected to take it over, and nobody has said the hard parts out loud.',
    because: 'for when family is in the business and the handover has never been discussed plainly',
    signals: ['family business', 'my son', 'my daughter', 'children', 'next generation', 'pass it on', 'pass the business', 'inherit', 'family member', 'brother', 'take it over'] },

  // ── How you treat people ────────────────────────────────────────────────
  // His own list of why people leave (31 Aug) is in Solomon's prompt as WHAT
  // MAKES A PLACE PEOPLE STAY. These are the books that go with it.
  { title: 'Everybody Matters', author: 'Bob Chapman and Raj Sisodia', topic: 'care',
    fits: 'People are treated as a cost; turnover, low morale, nobody feels their work is seen.',
    because: 'for running a company where people know they matter',
    signals: ['morale', 'turnover', 'people leaving', 'people are leaving', 'retention', 'recognition', 'treated', 'culture', 'just a number', 'compassion', 'appreciat'] },
  { title: 'The Dream Manager', author: 'Matthew Kelly', topic: 'advancement',
    fits: 'Good people leave because they cannot see a future in the company.',
    because: 'for keeping good people by helping them see a future with you',
    signals: ['advance', 'career', 'way up', 'growth path', 'promot', 'keep good people', 'retention', 'turnover', 'no future', 'people leaving'] },
  { title: 'Radical Candor', author: 'Kim Scott', topic: 'feedback',
    fits: 'No honest feedback given, or feedback given harshly. Problems tolerated instead of raised.',
    because: 'for telling people the truth about their work because you care about them',
    signals: ['feedback', 'criticism', 'hard conversation', 'difficult conversation', 'performance', 'underperform', 'late every day', 'tolerat', 'nothing said', 'yell'] },
  { title: 'Extreme Ownership', author: 'Jocko Willink and Leif Babin', topic: 'ownership',
    fits: 'Failures get pinned on the crew when the cause is upstream: no training, no standard, no plan.',
    because: 'for when a failure on the crew starts with something upstream that was never fixed',
    signals: ['blame', 'excuse', 'ownership', 'whose fault', 'not trained', 'never trained', 'standard', 'same mistake', 'accountab'] },
  { title: 'Leaders Eat Last', author: 'Simon Sinek', topic: 'trust',
    fits: 'The team does not feel safe or backed by the person in charge.',
    because: 'for building a team that trusts the person leading it',
    signals: ['trust', 'safe', 'loyal', 'morale', 'backed', 'culture', 'us and them', 'pull together'] },
  { title: 'The Five Dysfunctions of a Team', author: 'Patrick Lencioni', topic: 'team',
    fits: 'A leadership group that avoids conflict, does not commit, and does not hold each other to account.',
    because: 'for a team that avoids the hard talk and then does not follow through',
    signals: ['trust', 'conflict', 'commit', 'accountab', 'results', 'leadership team', 'not on the same page', 'silo'] },
  { title: 'The Servant', author: 'James C. Hunter', topic: 'leading',
    fits: 'Owner leads by position and volume; wants to lead in a way people choose to follow.',
    because: 'for leading by serving the people who do the work',
    signals: ['yell', 'respect', 'authority', 'old school', 'lead by', 'how you are spoken to', 'how they are spoken to', 'serve'] },
  { title: 'EntreLeadership', author: 'Dave Ramsey', topic: 'owner-as-leader',
    fits: 'An owner who built it with his hands and now has to lead people. A practical playbook, small-business sized.',
    because: 'for the owner who started on the tools and now has to lead a team',
    signals: ['first hire', 'growing the team', 'lead a team', 'leading people', 'gossip', 'small team', 'from the tools', 'never managed'] },

  // ── Business, family and time ───────────────────────────────────────────
  { title: 'Win at Work and Succeed at Life', author: 'Michael Hyatt and Megan Hyatt Miller', topic: 'work-and-life',
    fits: 'Owner believes the business needs every hour he has; home is getting what is left.',
    because: 'for winning at work without losing at home',
    signals: ['overwork', 'work life', 'evenings', 'weekends', 'family', 'burnout', 'burn out', 'hours', 'never home', 'no time off'] },
  { title: 'The 3 Big Questions for a Frantic Family', author: 'Patrick Lencioni', topic: 'family',
    fits: 'Owner runs the business with a plan and home with none; family life is reactive.',
    because: 'for bringing the same clarity home that you bring to the business',
    signals: ['family', 'at home', 'kids', 'wife', 'husband', 'spouse', 'frantic', 'chaos', 'home life'] },

  // ── Faith and work ──────────────────────────────────────────────────────
  // Just more books on the list. Matched by their signals like every other one,
  // with no flag, label or limit (Daniel, 11 Oct: "why do we need to segregate
  // it out").
  { title: 'Business by the Book', author: 'Larry Burkett', topic: 'stewardship',
    fits: 'Owner wants a practical framework for running the business by conviction rather than instinct.',
    because: 'for running the business by conviction', signals: ['conviction', 'principle', 'integrity', 'honest', 'steward', 'right way', 'ethic', 'do right by'] },
  { title: 'Business for the Glory of God', author: 'Wayne Grudem', topic: 'vocation',
    fits: 'Owner is quietly unsure whether profit and business are good things to pursue at all.',
    because: 'for whether business itself is a good thing to give your life to', signals: ['profit', 'guilt', 'is it right', 'greed', 'worth doing', 'good thing', 'ashamed', 'making money'] },
  { title: 'Every Good Endeavor', author: 'Timothy Keller and Katherine Leary Alsdorf', topic: 'vocation',
    fits: 'Owner treats work and faith as separate compartments, or feels their work does not matter.',
    because: 'for why ordinary work matters', signals: ['meaning', 'purpose', 'why i do this', 'what it is for', 'does it matter', 'matters', 'just a job', 'separate'] },
  { title: 'Work Matters', author: 'Tom Nelson', topic: 'vocation',
    fits: 'Owner sees ordinary work as second-rate next to ministry. Close to the thesis this product is built on.',
    because: 'for seeing ordinary work as a calling', signals: ['ordinary work', 'purpose', 'vocation', 'meaning', 'second rate', 'just a job', 'matters', 'serve'] },
  { title: 'The Gospel at Work', author: 'Sebastian Traeger and Greg Gilbert', topic: 'vocation',
    fits: 'Work has become either everything to the owner or nothing.',
    because: 'for when work has become everything, or nothing', signals: ['work is everything', 'identity', 'purpose', 'coast', 'everything to me', 'who i am', 'meaning', 'drive'] },
  { title: 'Love Works', author: 'Joel Manby', topic: 'care',
    fits: 'Owner wants to lead people with patience, kindness and honesty as things he does, not feelings he has.',
    because: 'for leading people with patience, kindness and honesty', signals: ['morale', 'turnover', 'treated', 'culture', 'patien', 'kind', 'respect', 'recognition', 'compassion', 'people leaving'] },
  { title: 'When Work and Family Collide', author: 'Andy Stanley', topic: 'work-and-life',
    fits: 'Work is taking time that belongs to the family and the owner knows it.',
    because: 'for when work keeps taking what belongs to your family', signals: ['family', 'at home', 'evenings', 'weekends', 'hours', 'missed', 'never home', 'wife', 'kids'] },
  { title: 'Margin', author: 'Richard A. Swenson', topic: 'whole-person',
    fits: 'Owner is running with no reserve of time, energy or money. Everything is at the limit.',
    because: 'for getting some room back in a life with none left', signals: ['overload', 'burnout', 'burn out', 'exhaust', 'no time', 'stretched', 'no reserve', 'at the limit', 'hours'] },
  { title: 'The Ruthless Elimination of Hurry', author: 'John Mark Comer', topic: 'whole-person',
    fits: 'Owner is always rushing and it is costing him the things he says matter most.',
    because: 'for slowing down before it costs you what matters', signals: ['hurry', 'rush', 'busy', 'burnout', 'burn out', 'no time', 'always on', 'frantic'] },
  { title: 'The Treasure Principle', author: 'Randy Alcorn', topic: 'giving',
    fits: 'Owner raises giving themselves and wants to think about it more deliberately. Never offer unprompted.',
    because: 'for thinking about giving deliberately', signals: ['giving', 'tithe', 'tithing', 'generos', 'donat', 'charity', 'give away'] },
  { title: 'Halftime', author: 'Bob Buford', topic: 'legacy',
    fits: 'Owner is successful and asking what the rest of it is for.',
    because: 'for asking what the rest of it is for', signals: ['what it is for', 'legacy', 'second half', 'what next', 'significance', 'retire', 'enough', 'success'] },
  { title: 'Boundaries for Leaders', author: 'Henry Cloud', topic: 'whole-person',
    fits: 'Business is consuming the owner; no line between work and family.',
    because: 'for putting a line between the business and the rest of your life', signals: ['boundar', 'consuming', 'no line', 'work and family', 'always working', 'evenings', 'weekends', 'say no'] },
]

/** Compact block for the system prompt. Titles and authors only — no summaries
 *  the model could mistake for quotable content. */
export function referenceCanonBlock() {
  return REFERENCE_BOOKS
    .map(b => `- ${b.title} — ${b.author} (${b.topic}): ${b.fits}`)
    .join('\n')
}
