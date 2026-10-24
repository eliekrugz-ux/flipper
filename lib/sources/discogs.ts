// Discogs API. Marketplace stats are public; price suggestions need a personal token.
// https://www.discogs.com/developers — a descriptive User-Agent is required.

const BASE = "https://api.discogs.com";
const UA = "FlipperBot/0.1 +https://flipper-lyart.vercel.app";

function headers(): HeadersInit {
  const h: Record<string, string> = { "User-Agent": UA };
  if (process.env.DISCOGS_TOKEN) h.Authorization = `Discogs token=${process.env.DISCOGS_TOKEN}`;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: headers(), cache: "no-store" });
  if (!r.ok) throw new Error(`Discogs ${r.status} ${path}`);
  return r.json() as Promise<T>;
}

export interface DiscogsListing {
  id: number;
  title: string;
  releaseId: number;
  price: number;
  shipping: number;
  condition: string;
  url: string;
  status: string;
}

export async function getListing(id: string | number): Promise<DiscogsListing> {
  const l = await get<{
    id: number; status: string; condition: string; uri: string;
    price: { value: number }; shipping_price?: { value: number };
    release: { id: number; description: string };
  }>(`/marketplace/listings/${id}?curr_abbr=USD`);
  return {
    id: l.id,
    title: l.release.description,
    releaseId: l.release.id,
    price: l.price.value,
    shipping: l.shipping_price?.value ?? 5,
    condition: l.condition,
    url: l.uri,
    status: l.status,
  };
}

export async function releaseStats(releaseId: number) {
  return get<{ num_for_sale: number; lowest_price: { value: number } | null }>(
    `/marketplace/stats/${releaseId}?curr_abbr=USD`,
  );
}

// Discogs' own suggested price per condition, derived from its sales history. Requires DISCOGS_TOKEN.
export async function priceSuggestions(releaseId: number): Promise<Record<string, number> | null> {
  if (!process.env.DISCOGS_TOKEN) return null;
  const d = await get<Record<string, { value: number }>>(`/marketplace/price_suggestions/${releaseId}`);
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.value]));
}

export function listingIdFromUrl(url: string): string | null {
  return url.match(/discogs\.com\/(?:[a-z]{2}\/)?sell\/item\/(\d+)/)?.[1] ?? null;
}
