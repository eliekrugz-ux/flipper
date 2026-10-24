// Read-only: how many deals the current Scout finds under different thresholds. Feeds the CEO's threshold call.
import { run as scout } from "../agents/scout";
import { DEFAULT_CONFIG, maxBuyPrice, priceDeal, type PricingConfig } from "../lib/pricing";

const variants: Array<[string, Partial<PricingConfig>, number]> = [
  ["current  $20 / 30% / conf60, offers≥80%", {}, 0.8],
  ["$20 / 25% / conf60, offers≥80%", { minRoi: 0.25 }, 0.8],
  ["$15 / 25% / conf55, offers≥80%", { minProfit: 15, minRoi: 0.25, minConfidence: 55 }, 0.8],
  ["$20 / 30% / conf60, offers≥75%", {}, 0.75],
];

(async () => {
  const t = Date.now();
  const cands = await scout(undefined, false);
  console.log(`candidates ${cands.length} from ${new Set(cands.map((c) => c.product.id)).size} products in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  for (const [name, over, ratio] of variants) {
    const cfg = { ...DEFAULT_CONFIG, ...over };
    const hits: string[] = [];
    for (const c of cands) {
      const base = { platform: "reverb", shipping: c.listing.shipping, comps: c.comps, compSource: "active_proxy" as const };
      let r = priceDeal({ ...base, buyPrice: c.listing.price }, cfg);
      let tag = "buy";
      if (!r.qualifies && c.listing.offersEnabled && r.confidence >= cfg.minConfidence) {
        const o = maxBuyPrice(r, c.listing.price, cfg);
        if (o >= c.listing.price * ratio) { r = priceDeal({ ...base, buyPrice: o }, cfg); tag = `offer $${o}`; }
      }
      if (r.qualifies) hits.push(`  ${tag.padEnd(10)} net $${r.netProfit.toFixed(0).padStart(4)} roi ${Math.round(r.roi * 100)}% conf ${r.confidence} | ${c.listing.title.slice(0, 55)} ($${c.listing.price})`);
    }
    console.log(`\n${name}: ${hits.length}`);
    if (name.startsWith("current")) hits.slice(0, 40).forEach((h) => console.log(h));
  }
})();
