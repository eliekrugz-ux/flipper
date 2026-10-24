import Link from "next/link";
import { usd, type Deal } from "@/lib/queries";

// Homepage version B (Terac Study 1): leads with real found deals, Check as the main action.
export function HeroB({ deals, seatUrl }: { deals: Deal[]; seatUrl: string }) {
  return (
    <div className="col-span-12 md:col-span-8">
      <div className="label">Found this week · furniture · clothing · sneakers · watches · cameras · cars · gear</div>
      <h1 className="display mt-4 text-[11vw] sm:text-6xl lg:text-[88px]">
        Buy low. Resell<span className="text-red">.</span>
        <br />
        <span className="chrome-text">Profit shown first.</span>
      </h1>
      <ul className="mt-6 max-w-xl border-t border-ink">
        {deals.slice(0, 3).map((d) => (
          <li key={d.id} className="flex justify-between gap-3 border-b border-hair py-2 text-sm">
            <span className="min-w-0 truncate">{d.title}</span>
            <span className="shrink-0 font-mono">
              {usd(d.buy_price)} → {usd(d.market_value)} · <b className="text-red">+{usd(d.net_profit)}</b>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-xl text-lg text-ink-2">
        Paste any listing and get BUY, PASS or OFFER with the math, or get every deal 24 hours before the public.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/check" className="pill">Check a listing · $7</Link>
        <a href={seatUrl} className="pill-ghost">Members get deals first · $49</a>
      </div>
    </div>
  );
}
