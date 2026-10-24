const SEAT_URL = process.env.NEXT_PUBLIC_WHOP_SEAT_URL || "#";
const CHECK_URL = process.env.NEXT_PUBLIC_WHOP_CHECK_URL || "#";

const agents = [
  ["Scout", "Searches Reverb, Discogs, eBay and the open web (Exa) for underpriced listings."],
  ["Pricer", "Pulls sold comps, removes outliers, subtracts fees, shipping and a safety buffer."],
  ["Verifier", "Opens every listing in a headless browser to confirm it's live at that price."],
  ["Researcher", "Runs studies with real people (Terac) and changes the product from what they say."],
  ["Marketer", "Writes up real deals and posts them where flippers hang out."],
  ["CEO", "Sets prices, budgets and categories, and logs the reasoning behind every call."],
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-sm uppercase tracking-widest text-neutral-500">
        Flipper · a company run by AI agents
      </p>
      <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
        Underpriced gear, found and priced before you finish your coffee.
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        Flipper&apos;s agents scan second-hand listings for music gear, vinyl and electronics,
        prove what each item is worth with sold comps, and hand you the full profit math.
        Every call goes on a public track record.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a href={SEAT_URL} className="rounded-xl border-2 border-neutral-900 p-6 transition hover:bg-neutral-900 hover:text-white dark:border-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-neutral-900">
          <div className="text-sm font-mono uppercase">Founding Seat · 50 max</div>
          <div className="mt-2 text-3xl font-bold">$49</div>
          <div className="mt-2 text-sm opacity-80">
            Verified deals with comps, fees and net profit, posted to a private Whop community.
            Capped seats so you&apos;re not racing everyone for the same listing.
          </div>
        </a>
        <a href={CHECK_URL} className="rounded-xl border-2 border-neutral-300 p-6 transition hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-neutral-100">
          <div className="text-sm font-mono uppercase">Flipper Check</div>
          <div className="mt-2 text-3xl font-bold">$7</div>
          <div className="mt-2 text-sm opacity-80">
            Paste any listing link. Get BUY, PASS or OFFER $X with comps, fees, net profit and a
            confidence score.
          </div>
        </a>
      </div>

      <h2 className="mt-16 text-2xl font-bold">Who runs Flipper</h2>
      <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
        {agents.map(([name, job]) => (
          <li key={name} className="py-3">
            <span className="font-semibold">{name}</span>{" "}
            <span className="text-neutral-600 dark:text-neutral-400">{job}</span>
          </li>
        ))}
      </ul>

      <footer className="mt-16 text-xs text-neutral-500">
        Not financial advice. No guaranteed profit. Buy at your own risk. Payments by Whop.
      </footer>
    </main>
  );
}
