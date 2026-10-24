// Pricer math. Pure functions so they can be unit-tested and reused by /check.

export type CompSource = "sold" | "price_guide" | "active_proxy";

export interface PricingConfig {
  feeRates: Record<string, number>;
  safetyBuffer: number;
  minProfit: number;
  minRoi: number;
  minConfidence: number;
}

export const DEFAULT_CONFIG: PricingConfig = {
  feeRates: { ebay: 0.1325, reverb: 0.0819, discogs: 0.09, etsy: 0.095 },
  safetyBuffer: 5,
  minProfit: 20,
  minRoi: 0.3,
  minConfidence: 60,
};

// Active listings sit above what things actually sell for; discount them when no sold data exists.
export const ACTIVE_PROXY_FACTOR = 0.82;

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Tukey fences (1.5 × IQR). With fewer than 4 points there is no meaningful IQR, so keep everything.
export function removeOutliers(values: number[]): number[] {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length < 4) return clean;
  const s = [...clean].sort((a, b) => a - b);
  const q = (p: number) => {
    const i = (s.length - 1) * p;
    const lo = Math.floor(i);
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  return s.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
}

export function marketValue(comps: number[], source: CompSource): number {
  const m = median(removeOutliers(comps));
  return source === "active_proxy" ? m * ACTIVE_PROXY_FACTOR : m;
}

// 0–100. More comps and tighter spread raise confidence; proxy comps are capped lower than real sales.
export function confidence(comps: number[], source: CompSource, sellThrough?: number): number {
  const clean = removeOutliers(comps);
  if (clean.length === 0) return 0;
  const countScore = Math.min(clean.length / 10, 1) * 45;
  const m = median(clean);
  const spread = clean.length > 1 ? (Math.max(...clean) - Math.min(...clean)) / m : 0.5;
  const spreadScore = Math.max(0, 1 - spread) * 35;
  const stScore = sellThrough === undefined ? 10 : Math.min(Math.max(sellThrough, 0), 1) * 20;
  const raw = countScore + spreadScore + stScore;
  const cap = source === "sold" ? 100 : source === "price_guide" ? 90 : 70;
  return Math.round(Math.min(raw, cap));
}

export interface PriceInput {
  platform: string;
  buyPrice: number;
  shipping: number;
  comps: number[];
  compSource: CompSource;
  sellThrough?: number;
}

export interface PriceResult {
  marketValue: number;
  fees: number;
  netProfit: number;
  roi: number;
  confidence: number;
  compsCount: number;
  qualifies: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceDeal(input: PriceInput, cfg: PricingConfig = DEFAULT_CONFIG): PriceResult {
  const mv = marketValue(input.comps, input.compSource);
  const feeRate = cfg.feeRates[input.platform] ?? cfg.feeRates.ebay;
  const fees = mv * feeRate;
  const net = mv - fees - input.shipping - input.buyPrice - cfg.safetyBuffer;
  const roi = input.buyPrice > 0 ? net / input.buyPrice : 0;
  const conf = confidence(input.comps, input.compSource, input.sellThrough);
  return {
    marketValue: round2(mv),
    fees: round2(fees),
    netProfit: round2(net),
    roi: round2(roi),
    confidence: conf,
    compsCount: removeOutliers(input.comps).length,
    qualifies:
      Number.isFinite(net) && net >= cfg.minProfit && roi >= cfg.minRoi && conf >= cfg.minConfidence,
  };
}

export type Verdict = { verdict: "BUY" | "PASS" | "OFFER"; offerPrice?: number };

// Highest price that still clears both profit and ROI thresholds.
export function maxBuyPrice(r: PriceResult, buyPrice: number, cfg: PricingConfig = DEFAULT_CONFIG): number {
  // What the item nets after fees, shipping and buffer, independent of what we pay for it.
  const proceeds = r.netProfit + buyPrice;
  const byProfit = proceeds - cfg.minProfit;
  const byRoi = proceeds / (1 + cfg.minRoi);
  return Math.floor(Math.min(byProfit, byRoi));
}

export function verdict(r: PriceResult, buyPrice: number, cfg: PricingConfig = DEFAULT_CONFIG): Verdict {
  if (r.qualifies) return { verdict: "BUY" };
  if (r.confidence < cfg.minConfidence) return { verdict: "PASS" };
  const offer = maxBuyPrice(r, buyPrice, cfg);
  // Only suggest an offer a seller might plausibly accept (≥ 70% of ask).
  if (offer > 0 && offer >= buyPrice * 0.7) return { verdict: "OFFER", offerPrice: offer };
  return { verdict: "PASS" };
}
