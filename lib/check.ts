// Flipper Check: one listing URL in, BUY / PASS / OFFER $X out, with the math behind it.
import { DEFAULT_CONFIG, priceDeal, verdict, type CompSource, type PricingConfig } from "./pricing";
import * as reverb from "./sources/reverb";
import * as discogs from "./sources/discogs";
import * as ebay from "./sources/ebay";

export interface CheckResult {
  verdict: "BUY" | "PASS" | "OFFER";
  offerPrice?: number;
  title: string;
  source: string;
  url: string;
  askPrice: number;
  shipping: number;
  marketValue: number;
  fees: number;
  netProfit: number;
  roi: number;
  confidence: number;
  compsCount: number;
  compSource: CompSource;
  notes: string[];
}

export class UnsupportedListing extends Error {}

export async function runCheck(url: string, cfg: PricingConfig = DEFAULT_CONFIG): Promise<CheckResult> {
  const reverbId = reverb.listingIdFromUrl(url);
  if (reverbId) return checkReverb(reverbId, cfg);
  const discogsId = discogs.listingIdFromUrl(url);
  if (discogsId) return checkDiscogs(discogsId, cfg);
  const ebayId = ebay.itemIdFromUrl(url);
  if (ebayId && !ebay.ebayEnabled()) throw new UnsupportedListing("eBay checks are coming online shortly. Your credit wasn't used.");
  if (ebayId) return checkEbay(ebayId, cfg);
  throw new UnsupportedListing("Flipper Check supports eBay, Reverb and Discogs listing links.");
}

async function checkEbay(id: string, cfg: PricingConfig): Promise<CheckResult> {
  const listing = await ebay.getItem(id);
  if (!listing) throw new UnsupportedListing("That eBay listing has ended or doesn't exist.");
  const notes: string[] = [];
  let comps: number[];
  if (listing.epid) {
    // Same eBay catalog product = same item.
    comps = (await ebay.searchUsed("", { epid: listing.epid })).filter((l) => l.id !== listing.id).map((l) => l.price);
    notes.push(`Compared against ${comps.length} used listings of the same eBay catalog product.`);
  } else {
    const query = listing.title.split(/\s+/).slice(0, 6).join(" ");
    comps = (await ebay.searchUsed(query)).filter((l) => l.id !== listing.id).map((l) => l.price);
    notes.push(`No catalog match; compared against ${comps.length} used listings matching "${query}". Treat with extra care.`);
  }
  if (listing.localPickupOnly) notes.push("Local pickup only: no shipping cost included.");
  if (listing.offersEnabled) notes.push("Seller accepts Best Offer.");
  notes.push("eBay's sold data isn't available to us, so market value = median live price × 0.82.");
  return finish(listing.title, "ebay", listing.url, listing.price, listing.shipping, comps, "active_proxy", notes, cfg);
}

async function checkReverb(id: string, cfg: PricingConfig): Promise<CheckResult> {
  const listing = await reverb.getListing(id);
  const product = await reverb.productForListing(listing);
  const notes: string[] = [];
  let comps: number[] = [];
  if (product) {
    comps = (await reverb.productListings(product)).filter((l) => l.id !== listing.id).map((l) => l.price);
    notes.push(`Compared against ${comps.length} live used listings of "${product.title}".`);
  } else {
    notes.push("Couldn't match this listing to an exact product, so there are no reliable comps.");
  }
  if (listing.state !== "live") notes.push(`Listing state is "${listing.state}", it may no longer be available.`);
  if (listing.offersEnabled) notes.push("Seller accepts offers.");
  notes.push("Reverb's sold-price guide isn't public, so market value = median live price × 0.82.");
  return finish(listing.title, "reverb", listing.url, listing.price, listing.shipping, comps, "active_proxy", notes, cfg);
}

async function checkDiscogs(id: string, cfg: PricingConfig): Promise<CheckResult> {
  const listing = await discogs.getListing(id);
  const notes: string[] = [];
  const suggestions = await discogs.priceSuggestions(listing.releaseId).catch(() => null);
  let comps: number[] = [];
  let source: CompSource = "active_proxy";
  const suggested = suggestions?.[listing.condition];
  if (suggested) {
    // Discogs' suggestion comes from its sales history for this exact release + condition.
    comps = [suggested];
    source = "price_guide";
    notes.push(`Discogs suggests $${suggested.toFixed(2)} for "${listing.condition}" based on its sales history.`);
  } else {
    const stats = await discogs.releaseStats(listing.releaseId);
    if (stats.lowest_price) comps = [stats.lowest_price.value];
    notes.push(`No sales-history price available; using the lowest of ${stats.num_for_sale} copies for sale.`);
  }
  if (listing.status !== "For Sale") notes.push(`Listing status is "${listing.status}".`);
  return finish(listing.title, "discogs", listing.url, listing.price, listing.shipping, comps, source, notes, cfg);
}

function finish(
  title: string, source: string, url: string, askPrice: number, shipping: number,
  comps: number[], compSource: CompSource, notes: string[], cfg: PricingConfig,
): CheckResult {
  const r = priceDeal({ platform: source, buyPrice: askPrice, shipping, comps, compSource }, cfg);
  const v = verdict(r, askPrice, cfg);
  // No comps → NaN values; report zeros so the result renders and the PASS reads as "can't value it".
  const n = (x: number) => (Number.isFinite(x) ? x : 0);
  return {
    ...v, title, source, url, askPrice, shipping, compSource, notes,
    marketValue: n(r.marketValue), fees: n(r.fees), netProfit: n(r.netProfit), roi: n(r.roi),
    confidence: r.confidence, compsCount: r.compsCount,
  };
}
