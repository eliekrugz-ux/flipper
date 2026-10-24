import { run as scout, EBAY_WATCHLIST } from "@/agents/scout";
import { priceDeal, DEFAULT_CONFIG } from "@/lib/pricing";

// Prices this half-hour's web candidates without saving, to see why they pass or fail.
(async () => {
  const c = await scout([], true, [], EBAY_WATCHLIST);
  for (const x of c) {
    const r = priceDeal({ platform: x.source, buyPrice: x.listing.price, shipping: x.listing.shipping, comps: x.comps, compSource: "active_proxy" }, DEFAULT_CONFIG);
    console.log(`$${x.listing.price} mv ${r.marketValue} net ${r.netProfit} roi ${r.roi} conf ${r.confidence} n${x.comps.length} | ${x.listing.title.slice(0, 50)}`);
  }
})();
