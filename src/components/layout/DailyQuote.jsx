/**
 * DailyQuote — one new business quote per day, shown in the sidebar.
 *
 * No API needed. Picks deterministically by day-of-year so every user sees
 * the same quote on the same day and it never changes mid-session.
 */

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "Don't find customers for your products, find products for your customers.", author: "Seth Godin" },
  { text: "Chase the vision, not the money; the money will end up following you.", author: "Tony Hsieh" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "You don't build a business. You build people, and then people build the business.", author: "Zig Ziglar" },
  { text: "The entrepreneur always searches for change, responds to it, and exploits it as an opportunity.", author: "Peter Drucker" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "I never dreamed about success. I worked for it.", author: "Estée Lauder" },
  { text: "Revenue is vanity, profit is sanity, cash is reality.", author: "" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Business opportunities are like buses, there's always another one coming.", author: "Richard Branson" },
  { text: "Leadership is not about being in charge. It's about taking care of those in your charge.", author: "Simon Sinek" },
  { text: "Work like there is someone working 24 hours a day to take it all away from you.", author: "Mark Cuban" },
  { text: "If you're not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman" },
  { text: "Make every detail perfect, and limit the number of details to perfect.", author: "Jack Dorsey" },
  { text: "Every problem is a gift — without problems we would not grow.", author: "Tony Robbins" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Build something 100 people love, not something 1 million people kind of like.", author: "Brian Chesky" },
  { text: "You have to be willing to be misunderstood if you're going to innovate.", author: "Jeff Bezos" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Think big, start small, act now.", author: "" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "A satisfied customer is the best business strategy of all.", author: "Michael LeBoeuf" },
  { text: "Take care of your employees and they'll take care of your customers.", author: "J.W. Marriott" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "The best marketing doesn't feel like marketing.", author: "Tom Fishburne" },
  { text: "Growth and comfort do not coexist.", author: "Ginni Rometty" },
  { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
  { text: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { text: "A business that makes nothing but money is a poor business.", author: "Henry Ford" },
  { text: "Hire character. Train skill.", author: "Peter Schutz" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { text: "Be stubborn on vision, but flexible on details.", author: "Jeff Bezos" },
  { text: "Customers don't expect you to be perfect. They do expect you to fix things when they go wrong.", author: "Donald Porter" },
  { text: "The secret to successful hiring is this: look for the people who want to change the world.", author: "Marc Benioff" },
  { text: "Profit in business comes from repeat customers — customers that boast about your service.", author: "W. Edwards Deming" },
  { text: "Move fast, but don't break trust.", author: "" },
  { text: "You don't need to be first. You need to be best.", author: "" },
  { text: "The real measure of your wealth is how much you'd be worth if you lost all your money.", author: "" },
  { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
  { text: "Success usually comes to those who are too busy looking for it.", author: "Henry David Thoreau" },
  { text: "Your reputation is more important than your next paycheck.", author: "" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman" },
  { text: "If you genuinely care about the customer, you can't go wrong.", author: "" },
  { text: "The goal of a startup is to find a repeatable, scalable business model.", author: "Steve Blank" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The secret of business is to know something that nobody else knows.", author: "Aristotle Onassis" },
  { text: "You're not finished when you fail. You're finished when you quit.", author: "" },
  { text: "Clarity is the antidote to anxiety.", author: "" },
  { text: "A company is only as good as its people. The hard part is saying it and meaning it.", author: "" },
  { text: "Solve one problem extraordinarily well before you solve ten problems adequately.", author: "" },
  { text: "Cash flow is more important than your mother.", author: "" },
  { text: "Do what you do so well that they will want to see it again and bring their friends.", author: "Walt Disney" },
  { text: "Execution is the game. Strategy is just the ticket to play.", author: "" },
  { text: "The best salespeople ask the best questions.", author: "" },
  { text: "Systems run the business. People run the systems.", author: "Michael E. Gerber" },
]

/** Pick a quote deterministically based on the current calendar date. */
function getTodayQuote() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return QUOTES[dayOfYear % QUOTES.length]
}

export default function DailyQuote() {
  const { text, author } = getTodayQuote()

  return (
    <div className="px-4 py-4 border-t border-ink-800">
      {/* Amber opening quote mark */}
      <span className="text-brand-400 text-xl font-serif leading-none select-none" aria-hidden>
        "
      </span>
      <p className="text-[11px] text-ink-400 italic leading-relaxed mt-0.5">
        {text}
      </p>
      {author && (
        <p className="text-[10px] text-ink-600 font-medium mt-1.5 not-italic">
          — {author}
        </p>
      )}
    </div>
  )
}
