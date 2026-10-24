import { logAction } from "@/lib/db";
import { discoverProducts, findProducts, getListing, listingIdFromUrl, productForListing, productListings, type ReverbProduct } from "@/lib/sources/reverb";
import { search } from "@/lib/sources/exa";
import { pool } from "@/lib/pool";
import * as ebay from "@/lib/sources/ebay";

export interface Candidate {
  source: "reverb" | "ebay";
  listing: {
    title: string;
    price: number;
    shipping: number;
    condition: string;
    url: string;
    photo?: string;
    offersEnabled: boolean;
    localPickupOnly?: boolean;
  };
  product: { id: string; title: string }; // id is unique within the source
  category: string;
  comps: number[]; // other live used listings of the exact same product
}

// eBay covers everything else. Specific brand+model queries keep comps to the same item;
// catalog items (sneakers, cameras, electronics) are further grouped by eBay product ID.
export const EBAY_WATCHLIST: Record<string, string[]> = {
  furniture: [
    "Herman Miller Aeron chair", "Herman Miller Embody chair", "Steelcase Leap V2", "Eames lounge chair ottoman",
    "Eames molded plastic side chair", "Knoll Barcelona chair", "Saarinen tulip table", "Wassily chair",
    "Noguchi coffee table", "Cesca chair Marcel Breuer", "mid century teak dresser", "Danish teak credenza",
    "Stokke Tripp Trapp", "Vitra Panton chair", "Hans Wegner wishbone chair",
  ],
  clothing: [
    "Levi's 501 vintage big E", "Carhartt Detroit jacket vintage", "Patagonia Retro-X fleece", "Arc'teryx Beta AR jacket",
    "Barbour Bedale jacket", "Red Wing Iron Ranger", "Dr. Martens 1460", "Canada Goose Expedition parka",
    "Ralph Lauren vintage Polo bear sweater", "Stone Island jacket",
  ],
  sneakers: [
    "Air Jordan 1 Retro High OG", "Nike Dunk Low Panda", "New Balance 990v3", "Adidas Yeezy Boost 350 V2",
    "Nike Air Max 1", "Salomon XT-6",
  ],
  watches: ["Seiko SKX007", "Omega Seamaster 300M", "Tudor Black Bay 58", "Casio G-Shock DW-5000", "Tissot PRX"],
  cameras: ["Fujifilm X100V", "Canon AE-1 Program", "Sony a7 III body", "Leica M6", "Ricoh GR III", "Olympus Mju II"],
  electronics: [
    "Nintendo Switch OLED", "Steam Deck 512GB", "iPad Pro 11 M2", "Apple Watch Ultra", "DJI Mini 3 Pro",
    "Sony WH-1000XM5", "MacBook Air M2", "Bose QuietComfort Ultra",
  ],
  collectibles: ["LEGO 10179 Millennium Falcon", "Pokemon Base Set booster", "Hot Wheels Redline", "vintage Star Wars Kenner figure"],
  cars: ["Toyota Tacoma 2008", "Honda Civic Si 2017", "Mazda Miata NA", "Porsche Boxster 986", "Jeep Wrangler TJ"],
  vinyl: ["Pink Floyd Dark Side of the Moon first press vinyl", "Beatles Abbey Road vinyl original", "Fleetwood Mac Rumours vinyl"],
};

// Reverb (music gear): liquid products with lots of identical units for clean comps.
export const DEFAULT_WATCHLIST = [
  // pedals
  "Boss DS-1", "Boss RC-30", "Boss DD-7", "Boss BD-2", "Boss TU-3", "Boss RV-6", "Boss DD-500",
  "Electro-Harmonix Big Muff Pi", "Electro-Harmonix Memory Man", "Ibanez TS9", "Ibanez TS808",
  "MXR Phase 90", "MXR Carbon Copy", "Strymon BigSky", "Strymon Timeline", "Strymon Flint",
  "Strymon El Capistan", "Line 6 HX Stomp", "Line 6 DL4", "Walrus Audio Julia", "JHS Morning Glory",
  "Keeley Compressor Plus", "TC Electronic Hall of Fame", "Eventide H9", "Chase Bliss Mood",
  "Fulltone OCD", "Wampler Tumnus", "Digitech Whammy", "Dunlop Cry Baby", "EarthQuaker Plumes",
  // synths / drum machines
  "Korg Minilogue XD", "Korg Monologue", "Korg Volca Bass", "Arturia MicroFreak", "Arturia MiniBrute 2",
  "Arturia KeyStep", "Roland TR-8S", "Roland TR-6S", "Roland SP-404 MKII", "Roland JU-06A",
  "Novation Circuit Tracks", "Elektron Digitakt", "Elektron Model:Cycles", "Behringer TD-3",
  "Teenage Engineering OP-1", "Teenage Engineering OP-Z", "Moog Mother-32", "Sequential Take 5",
  "Akai MPC One", "Native Instruments Maschine MK3",
  // amps
  "Fender Blues Junior", "Fender Hot Rod Deluxe", "Boss Katana 50", "Boss Katana 100",
  "Vox AC15", "Orange Crush 20", "Fender Princeton Reverb", "Marshall DSL40",
  // studio
  "Shure SM7B", "Shure SM58", "Universal Audio Apollo Twin", "Focusrite Scarlett 2i2",
  "Audio-Technica AT2020", "Rode NT1", "Yamaha HS8", "KRK Rokit 5", "Neumann TLM 102",
  // guitars
  "Fender Player Stratocaster", "Squier Classic Vibe Telecaster", "Epiphone Les Paul Standard",
  "Gibson Les Paul Studio", "Fender American Professional II Stratocaster", "Ibanez RG550",
];

// The cheapest few listings per product are the only ones that can be underpriced.
const PER_PRODUCT = 3;

// Listings filed under a product page that aren't the working product itself.
const NOT_THE_ITEM = /\b(case|gig ?bag|bag|cover|manual|box only|empty box|knob|knobs|footswitch|power supply|adapter|cable|parts?|repair|broken|not working|as[- ]is|faulty|for spares|decal|sticker|strap|stand|template|pcb|kit|replica|clone|loaded body|body only|neck only|pickguard|faceplate|chassis only|tolex)\b/i;
// Far below the product's median is almost always a different item, an accessory or a scam — never a real steal.
const MIN_PRICE_VS_MEDIAN = 0.4;

type Listing = Candidate["listing"] & { id: string | number };

// Shared by every source: drop non-items, then the cheapest few (above the sanity floor) vs everyone else.
function pickCandidates(
  all: Listing[], source: Candidate["source"], product: Candidate["product"], category: string,
): Candidate[] {
  const listings = all.filter((l) => !NOT_THE_ITEM.test(l.title));
  if (listings.length < 4) return [];
  const prices = listings.map((l) => l.price).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  return listings
    .filter((l) => l.price >= median * MIN_PRICE_VS_MEDIAN)
    .sort((a, b) => a.price + a.shipping - (b.price + b.shipping))
    .slice(0, PER_PRODUCT)
    .map((listing) => ({
      source, product, category, listing,
      comps: listings.filter((l) => l.id !== listing.id).map((l) => l.price),
    }));
}

async function scanProduct(product: ReverbProduct): Promise<Candidate[]> {
  return pickCandidates(await productListings(product), "reverb", { id: `csp:${product.id}`, title: product.title }, "music gear");
}

// eBay has no product pages outside its catalog, so comps = results whose title contains every
// word of the query; catalog items are split further by eBay product ID (epid) for exact matches.
async function scanEbayQuery(query: string, category: string): Promise<Candidate[]> {
  const words = query.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  const listings = (await ebay.searchUsed(query)).filter((l) => {
    const t = l.title.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
    return words.every((w) => t.includes(w));
  });
  const byEpid = new Map<string, ebay.EbayListing[]>();
  for (const l of listings) if (l.epid) byEpid.set(l.epid, [...(byEpid.get(l.epid) ?? []), l]);
  const out: Candidate[] = [];
  for (const [epid, group] of byEpid) {
    if (group.length >= 4) out.push(...pickCandidates(group, "ebay", { id: `epid:${epid}`, title: group[0].title }, category));
  }
  if (!out.length) out.push(...pickCandidates(listings, "ebay", { id: `q:${query.toLowerCase()}`, title: query }, category));
  return out;
}

// Exa finds Reverb listings people are writing/linking about; we resolve them to exact products.
async function exaDiscover(): Promise<ReverbProduct[]> {
  const hits = await search("used guitar pedal synth deal for sale reverb.com/item", {
    numResults: 10,
    includeDomains: ["reverb.com"],
  });
  const ids = hits.map((h) => listingIdFromUrl(h.url)).filter((id): id is string => !!id);
  // Rejections are listings that sold or were removed since Exa indexed them.
  const resolved = await Promise.allSettled(ids.map(async (id) => productForListing(await getListing(id))));
  const products: ReverbProduct[] = [];
  for (const r of resolved) {
    if (r.status === "fulfilled" && r.value && !products.some((x) => x.id === r.value!.id)) products.push(r.value);
  }
  return products;
}

// Broad sweeps: each returns every product page in that category with enough used listings for comps.
export const DEFAULT_CATEGORIES = [
  "overdrive pedal", "distortion pedal", "fuzz pedal", "delay pedal", "reverb pedal", "looper pedal",
  "chorus pedal", "compressor pedal", "multi-effects", "synthesizer", "drum machine", "sampler",
  "midi controller", "audio interface", "condenser microphone", "dynamic microphone", "studio monitor",
  "guitar amp", "bass amp", "electric guitar", "bass guitar", "acoustic guitar", "turntable", "dj controller",
];

export async function run(
  watchlist: string[] = DEFAULT_WATCHLIST,
  useExa = true,
  categories: string[] = DEFAULT_CATEGORIES,
  ebayWatchlist: Record<string, string[]> = EBAY_WATCHLIST,
): Promise<Candidate[]> {
  await logAction("scout", "start", { watchlist: watchlist.length, categories: categories.length, useExa });
  const products = new Map<number, ReverbProduct>();
  const add = (ps: ReverbProduct[]) => ps.forEach((p) => products.set(p.id, p));

  const lookups = await pool(watchlist, 10, (q) => findProducts(q, 1));
  lookups.forEach((r) => r.status === "fulfilled" && add(r.value.slice(0, 1)));
  const sweeps = await pool(categories, 6, (q) => discoverProducts(q));
  sweeps.forEach((r) => r.status === "fulfilled" && add(r.value));
  if (useExa) {
    const found = await exaDiscover().catch(() => []);
    await logAction("scout", "exa_discovery", { products: found.map((p) => p.title) });
    add(found);
  }

  const scans = await pool([...products.values()], 10, scanProduct);
  const candidates = scans.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  let failed = scans.filter((r) => r.status === "rejected").length;

  let ebayQueries = 0;
  if (ebay.ebayEnabled()) {
    const queries = Object.entries(ebayWatchlist).flatMap(([cat, qs]) => qs.map((q) => [q, cat] as const));
    ebayQueries = queries.length;
    const ebayScans = await pool(queries, 6, ([q, cat]) => scanEbayQuery(q, cat));
    candidates.push(...ebayScans.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
    failed += ebayScans.filter((r) => r.status === "rejected").length;
  }
  if (failed) await logAction("scout", "scan_failed", { failed });
  await logAction("scout", "done", { products: products.size, ebayQueries, candidates: candidates.length });
  return candidates;
}
