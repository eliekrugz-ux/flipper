import { DealCard } from "../components/DealCard";
import { recentDeals } from "@/lib/queries";

export const metadata = { title: "Track record — Flipper" };

export default async function DealsPage() {
  const deals = await recentDeals(100);
  return (
    <main className="wrap">
      <div className="grid12 gap-y-4 pt-12">
        <div className="col-span-12 md:col-span-7">
          <div className="label"><span className="sec-num">—</span> Public record</div>
          <h1 className="display mt-3 text-6xl sm:text-7xl">Track<br /><span className="chrome-text">record.</span></h1>
        </div>
        <p className="col-span-12 md:col-span-5 self-end text-ink-2">
          Every deal Flipper has called, newest first. Market value is the median of comparable listings for
          the exact same product, outliers removed. When no sold data is public, we use live listings × 0.82
          and say so (&ldquo;active proxy&rdquo;).
        </p>
      </div>
      <div className="mt-10 border-t-[3px] border-ink">
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
        {!deals.length && <p className="py-8 text-sm text-ink-2">No deals yet.</p>}
      </div>
    </main>
  );
}
