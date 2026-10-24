import { usd, type Deal } from "@/lib/queries";

export function DealCard({ deal }: { deal: Deal }) {
  const pay = deal.deal_type === "offer" && deal.offer_price ? deal.offer_price : deal.buy_price;
  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-900 dark:border-neutral-800 dark:hover:border-neutral-100"
    >
      {deal.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={deal.photo_url} alt="" className="h-20 w-20 flex-none rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{deal.title}</div>
        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {deal.deal_type === "offer" ? (
            <>Listed {usd(deal.buy_price)} · <b>offer {usd(pay)}</b></>
          ) : (
            <>Buy at <b>{usd(pay)}</b></>
          )}{" "}
          · worth ~{usd(deal.market_value)} · {deal.condition}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
            net +{usd(deal.net_profit)}
          </span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">ROI {Math.round(deal.roi * 100)}%</span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">confidence {deal.confidence}</span>
          <span className="rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">{deal.comps_count} comps · {deal.source}</span>
        </div>
      </div>
    </a>
  );
}
