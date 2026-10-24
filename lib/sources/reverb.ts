// Reverb public API. Listing search and comparison-shopping pages (CSPs) work without auth.
// The price guide / transactions endpoints are no longer public, so comps are active listings.

const BASE = "https://api.reverb.com/api";
const headers = (): HeadersInit => ({
  "Accept-Version": "3.0",
  Accept: "application/hal+json",
  ...(process.env.REVERB_TOKEN ? { Authorization: `Bearer ${process.env.REVERB_TOKEN}` } : {}),
});

export interface ReverbListing {
  id: number;
  title: string;
  make: string;
  model: string;
  price: number;
  shipping: number;
  condition: string;
  url: string;
  offersEnabled: boolean;
  photo?: string;
  state: string;
}

export interface ReverbProduct {
  id: number;
  slug: string;
  title: string;
  usedTotal: number;
  usedLowPrice?: number;
  listingsHref: string;
}

// Used conditions only; "brand-new" and "b-stock" sell on a different curve.
const USED = new Set(["mint", "excellent", "very-good", "good", "fair", "poor"]);

type RawListing = {
  id: number;
  title: string;
  make: string;
  model: string;
  price: { amount: string };
  condition: { slug: string };
  shipping?: { rates?: { region_code: string; rate: { amount: string } }[] };
  _links: { web: { href: string }; photo?: { href: string } };
  offers_enabled?: boolean;
  state?: { slug: string };
};

function toListing(l: RawListing): ReverbListing {
  const rates = l.shipping?.rates ?? [];
  const us = rates.find((r) => r.region_code === "US_CON") ?? rates[0];
  return {
    id: l.id,
    title: l.title,
    make: l.make,
    model: l.model,
    price: Number(l.price.amount),
    shipping: us ? Number(us.rate.amount) : 15,
    condition: l.condition.slug,
    url: l._links.web.href.split("?")[0],
    offersEnabled: !!l.offers_enabled,
    photo: l._links.photo?.href,
    state: l.state?.slug ?? "live",
  };
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!r.ok) throw new Error(`Reverb ${r.status} ${url}`);
  return r.json() as Promise<T>;
}

export async function findProducts(query: string, perPage = 5): Promise<ReverbProduct[]> {
  const d = await get<{ comparison_shopping_pages: Array<{
    id: number; slug: string; title: string; used_total: number;
    used_low_price?: { amount: string }; _links: { listings: { href: string } };
  }> }>(`${BASE}/csps?query=${encodeURIComponent(query)}&per_page=${perPage}`);
  return d.comparison_shopping_pages.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    usedTotal: c.used_total,
    usedLowPrice: c.used_low_price ? Number(c.used_low_price.amount) : undefined,
    listingsHref: c._links.listings.href,
  }));
}

// All live used listings for one exact product.
export async function productListings(p: ReverbProduct, perPage = 50): Promise<ReverbListing[]> {
  const sep = p.listingsHref.includes("?") ? "&" : "?";
  const d = await get<{ listings: RawListing[] }>(`${p.listingsHref}${sep}condition=used&per_page=${perPage}`);
  return d.listings.map(toListing).filter((l) => USED.has(l.condition) && l.price > 0);
}

export async function getListing(id: string | number): Promise<ReverbListing> {
  return toListing(await get<RawListing>(`${BASE}/listings/${id}`));
}

export function listingIdFromUrl(url: string): string | null {
  return url.match(/reverb\.com\/item\/(\d+)/)?.[1] ?? null;
}

// Find the exact product page (CSP) for a listing so comps are the same item.
export async function productForListing(l: ReverbListing): Promise<ReverbProduct | null> {
  const products = await findProducts(`${l.make} ${l.model}`, 3);
  return products[0] ?? null;
}
