import Link from "next/link";
import { usd, type Deal } from "@/lib/queries";

// One Swiss table row per deal: photo, item, the numbers in fixed columns.
export function DealCard({ deal }: { deal: Deal }) {
  const pay = deal.deal_type === "offer" && deal.offer_price ? deal.offer_price : deal.buy_price;
  const rowClass = "group grid12 items-center gap-y-3 border-b border-hair py-5 transition-colors hover:bg-paper-2";
  const body = <Row deal={deal} pay={pay} />;
  if (deal.locked) {
    return <Link href="/members" className={rowClass}>{body}</Link>;
  }
  return (
    <a href={deal.url} target="_blank" rel="noopener noreferrer" className={rowClass}>{body}</a>
  );
}

function Row({ deal, pay }: { deal: Deal; pay: number }) {
  return (
    <>
      <div className="col-span-3 sm:col-span-2">
        {deal.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.photo_url} alt="" className="aspect-square w-full rounded-xl border border-hair object-cover" />
        ) : (
          <div className="orb w-full" />
        )}
      </div>
      <div className="col-span-9 sm:col-span-5 min-w-0">
        <div className="label">{deal.source} · {deal.condition} · {deal.comps_count} comps</div>
        <div className="mt-1 text-lg font-bold leading-tight tracking-tight group-hover:text-red">{deal.title}</div>
        <div className="mt-1 text-sm text-ink-2">
          {deal.deal_type === "offer" ? <>Listed {usd(deal.buy_price)} → offer <b className="text-ink">{usd(pay)}</b></> : <>Buy at <b className="text-ink">{usd(pay)}</b></>}
        </div>
        {deal.locked && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 font-mono text-[11px] font-bold uppercase text-paper">
            <span className="text-red">●</span> Members have the link · public in {deal.unlocks_in_h}h
          </div>
        )}
      </div>
      <dl className="col-span-12 sm:col-span-5 grid grid-cols-3 gap-2 text-right tnum">
        <div>
          <dt className="label">Worth</dt>
          <dd className="text-lg font-semibold">{usd(deal.market_value)}</dd>
        </div>
        <div>
          <dt className="label">Net</dt>
          <dd className="text-lg font-extrabold text-profit">+{usd(deal.net_profit)}</dd>
        </div>
        <div>
          <dt className="label">ROI · Conf.</dt>
          <dd className="text-lg font-semibold">{Math.round(deal.roi * 100)}% · {deal.confidence}</dd>
        </div>
      </dl>
    </>
  );
}
