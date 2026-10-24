import Link from "next/link";
import { DealCard } from "./components/DealCard";
import { topDeals } from "@/lib/queries";


const SEAT_URL = process.env.NEXT_PUBLIC_WHOP_SEAT_URL || "#";
const CHECK_URL = process.env.NEXT_PUBLIC_WHOP_CHECK_URL || "#";

const steps = [
  ["Find", "We watch thousands of used listings for music gear, vinyl and electronics, all day."],
  ["Price", "Each one is compared against listings for the exact same item. Outliers out, fees, shipping and a safety buffer subtracted."],
  ["Verify", "We confirm the listing is still live at that price before it reaches you."],
  ["Post", "Only deals that clear $20 net and 30% ROI make the cut, with the full math attached."],
];

export default async function Home() {
  const deals = await topDeals(3);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-sm uppercase tracking-widest text-neutral-500">
        Flipper · resale deals with the math done
      </p>
      <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
        Underpriced gear, found and priced before you finish your coffee.
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        Flipper scans second-hand listings for music gear, vinyl and electronics, proves what each
        item is worth with comps for the exact same item, and hands you the full profit math.
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

      <h2 className="mt-16 text-2xl font-bold">Latest deals</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Real listings, priced and checked. Every call stays on the{" "}
        <Link href="/deals" className="underline">public track record</Link>.
      </p>
      <div className="mt-4 grid gap-3">
        {deals.length ? (
          deals.map((d) => <DealCard key={d.id} deal={d} />)
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
            Scanning now. New deals appear here as soon as they pass the profit, ROI and confidence bars.
          </p>
        )}
      </div>

      <h2 className="mt-16 text-2xl font-bold">How it works</h2>
      <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
        {steps.map(([name, job]) => (
          <li key={name} className="py-3">
            <span className="font-semibold">{name}</span>{" "}
            <span className="text-neutral-600 dark:text-neutral-400">{job}</span>
          </li>
        ))}
      </ul>

      <footer className="mt-16 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
        <span>Not financial advice. No guaranteed profit. Buy at your own risk. Payments by Whop.</span>
        <Link href="/check" className="underline">Flipper Check</Link>
        <Link href="/legal/terms" className="underline">Terms</Link>
        <Link href="/legal/refunds" className="underline">Refunds</Link>
        <Link href="/legal/disclaimer" className="underline">Disclaimer</Link>
      </footer>
    </main>
  );
}
