import { db, getConfig, logAction } from "@/lib/db";
import { DEFAULT_CONFIG, maxBuyPrice, priceDeal, type PricingConfig } from "@/lib/pricing";

// Reverb sellers with offers enabled commonly accept 10–20% off; don't suggest lower than this.
const MIN_OFFER_RATIO = 0.8;
import type { Candidate } from "./scout";

export async function loadPricingConfig(): Promise<PricingConfig> {
  const [feeRates, safetyBuffer, minProfit, minRoi, minConfidence] = await Promise.all([
    getConfig("fee_rates", DEFAULT_CONFIG.feeRates),
    getConfig("safety_buffer_usd", DEFAULT_CONFIG.safetyBuffer),
    getConfig("min_profit_usd", DEFAULT_CONFIG.minProfit),
    getConfig("min_roi", DEFAULT_CONFIG.minRoi),
    getConfig("min_confidence", DEFAULT_CONFIG.minConfidence),
  ]);
  return {
    feeRates,
    safetyBuffer: Number(safetyBuffer),
    minProfit: Number(minProfit),
    minRoi: Number(minRoi),
    minConfidence: Number(minConfidence),
  };
}

export async function run(candidates: Candidate[]) {
  const cfg = await loadPricingConfig();
  const qualified = [];
  for (const c of candidates) {
    const input = { platform: c.source, shipping: c.listing.shipping, comps: c.comps, compSource: "active_proxy" as const };
    let r = priceDeal({ ...input, buyPrice: c.listing.price }, cfg);
    let offerPrice: number | null = null;
    if (!r.qualifies && c.listing.offersEnabled && r.confidence >= cfg.minConfidence) {
      const offer = maxBuyPrice(r, c.listing.price, cfg);
      if (offer >= c.listing.price * MIN_OFFER_RATIO) {
        offerPrice = offer;
        r = priceDeal({ ...input, buyPrice: offer }, cfg);
      }
    }
    if (!r.qualifies) continue;
    const row = {
      deal_type: offerPrice ? "offer" : "buy",
      offer_price: offerPrice,
      photo_url: c.listing.photo ?? null,
      source: c.source,
      url: c.listing.url,
      title: c.listing.title,
      item_key: `reverb:csp:${c.product.id}`,
      condition: c.listing.condition,
      buy_price: c.listing.price,
      market_value: r.marketValue,
      comp_source: "active_proxy",
      comps_count: r.compsCount,
      fees: r.fees,
      shipping: c.listing.shipping,
      net_profit: r.netProfit,
      roi: r.roi,
      confidence: r.confidence,
      // Profit-only ranking until Terac Study 2 adds human appeal/trust.
      final_score: r.netProfit,
    };
    qualified.push(row);
    await db()?.from("deals").upsert(row, { onConflict: "url", ignoreDuplicates: false });
  }
  await logAction("pricer", "priced", { candidates: candidates.length, qualified: qualified.length });
  return qualified;
}
