import Link from "next/link";
import { DealCard } from "./components/DealCard";
import { Section } from "./components/Chrome";
import { topDeals, usd } from "@/lib/queries";

const SEAT_URL = process.env.NEXT_PUBLIC_WHOP_SEAT_URL || "#";
const CHECK_URL = process.env.NEXT_PUBLIC_WHOP_CHECK_URL || "#";

const steps = [
  ["Find", "Thousands of used listings for music gear, vinyl and electronics, watched all day."],
  ["Price", "Compared against listings for the exact same item. Outliers out; fees, shipping and a safety buffer subtracted."],
  ["Verify", "Checked live at that price before it reaches you."],
  ["Post", "Only deals clearing $20 net and 30% ROI make the cut, with the full math attached."],
];

export default async function Home() {
  const deals = await topDeals(4);
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="floor" />
        <div className="wrap relative grid12 gap-y-8 pb-16 pt-10 sm:pt-16">
          <div className="col-span-12 md:col-span-8">
            <div className="label">Resale deals · music gear, vinyl, electronics</div>
            <h1 className="display mt-4 text-[13vw] sm:text-7xl lg:text-[104px]">
              Underpriced gear<span className="text-red">.</span>
              <br />
              <span className="chrome-text">Math done.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Flipper finds second-hand listings priced below what the exact same item sells for, works out
              fees, shipping and net profit, and hands you the deal. Every call goes on a public track record.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={SEAT_URL} className="pill">Get a Founding Seat · $49</a>
              <Link href="/check" className="pill-ghost">Check a listing · $7</Link>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex items-center justify-center">
            <div className="orb w-48 sm:w-64 md:w-full md:max-w-[300px]" />
          </div>
        </div>
      </section>

      {/* Live ticker of real deals */}
      {deals.length > 0 && (
        <div className="border-y-[3px] border-ink bg-ink py-2 text-paper">
          <div className="ticker font-mono text-sm">
            <div>
              {deals.concat(deals).map((d, i) => (
                <span key={i} className="mr-10">
                  <span className="text-red">●</span> {d.title.slice(0, 48)} — net <b>+{usd(d.net_profit)}</b> · ROI {Math.round(d.roi * 100)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="wrap">
        {/* Offers */}
        <Section n="01" title="Two ways in">
          <div className="grid12 mt-6 gap-y-5">
            <a href={SEAT_URL} className="panel col-span-12 md:col-span-7 block p-6 sm:p-8 transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-4">
                <div className="label">Founding Seat · 50 max</div>
                <span className="rounded-full bg-red px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">Limited</span>
              </div>
              <div className="display mt-3 text-6xl tnum">$49</div>
              <p className="mt-3 max-w-md text-ink-2">
                Every verified deal with comps, fees and net profit, posted to a private members feed. Seats are
                capped so you&apos;re not racing everyone for the same listing.
              </p>
              <span className="pill mt-6">Claim a seat</span>
            </a>
            <a href={CHECK_URL} className="panel col-span-12 md:col-span-5 block p-6 sm:p-8 transition-transform hover:-translate-y-0.5">
              <div className="label">Flipper Check · per listing</div>
              <div className="display mt-3 text-6xl tnum">$7</div>
              <p className="mt-3 text-ink-2">
                Paste a Reverb or Discogs link. Get <b className="text-ink">BUY</b>, <b className="text-ink">PASS</b> or{" "}
                <b className="text-ink">OFFER $X</b> with the math.
              </p>
              <span className="pill-ghost mt-6">Buy a check</span>
            </a>
          </div>
        </Section>

        {/* Deals */}
        <Section n="02" title="Latest deals">
          <p className="mt-2 text-sm text-ink-2 md:pl-[8.33%]">
            Real listings, priced and checked. Everything stays on the{" "}
            <Link href="/deals" className="underline decoration-red decoration-2 underline-offset-4">track record</Link>.
          </p>
          <div className="mt-4 border-t-[3px] border-ink">
            {deals.length ? (
              deals.map((d) => <DealCard key={d.id} deal={d} />)
            ) : (
              <p className="py-8 text-sm text-ink-2">Scanning now. New deals appear here as soon as they clear the bar.</p>
            )}
          </div>
        </Section>

        {/* How it works */}
        <Section n="03" title="How it works">
          <ol className="grid12 mt-6 gap-y-8">
            {steps.map(([name, body], i) => (
              <li key={name} className="col-span-12 sm:col-span-6 lg:col-span-3 border-t border-ink pt-3">
                <div className="font-mono text-sm text-red">0{i + 1}</div>
                <div className="display mt-2 text-2xl">{name}</div>
                <p className="mt-2 text-sm text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </main>
  );
}
