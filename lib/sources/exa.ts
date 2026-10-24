import Exa from "exa-js";

// Exa: web search built for agents. Used by Scout to spot in-demand gear and by Marketer to find communities.
export function exa(): Exa | null {
  return process.env.EXA_API_KEY ? new Exa(process.env.EXA_API_KEY) : null;
}

export interface ExaHit {
  url: string;
  title?: string | null;
  highlights?: string[];
}

export async function search(
  query: string,
  opts: { numResults?: number; includeDomains?: string[]; startPublishedDate?: string } = {},
): Promise<ExaHit[]> {
  const client = exa();
  if (!client) return [];
  const res = await client.search(query, {
    type: "auto",
    numResults: opts.numResults ?? 10,
    includeDomains: opts.includeDomains,
    startPublishedDate: opts.startPublishedDate,
    contents: { highlights: true },
  });
  return res.results.map((r) => ({
    url: r.url,
    title: (r as { title?: string | null }).title,
    highlights: (r as { highlights?: string[] }).highlights,
  }));
}

// Exa as a listing source: search allowed marketplaces, then have Exa extract price/condition per page
// with a JSON-schema summary. Covers categories no marketplace API gives us (furniture, clothing, cars).
export interface WebListing {
  id: string;
  url: string;
  title: string;
  price: number;
  shipping: number;
  condition: string;
  forSale: boolean;
  photo?: string;
}

const LISTING_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Item name as listed" },
    price_usd: { type: "number", description: "Current fixed asking price; 0 if not shown" },
    currency: { type: "string", description: "ISO currency code of the price, e.g. USD, EUR, GBP" },
    auction: { type: "boolean", description: "True if the price is a current bid in an auction rather than a fixed buy-now price" },
    shipping_usd: { type: "number", description: "Shipping cost in US dollars; 0 if free or not shown" },
    condition: { type: "string", description: "new, used, vintage, refurbished, or unknown" },
    for_sale: { type: "boolean", description: "True only if this page is a single item currently available to buy (not sold, not a category or article page)" },
  },
  required: ["title", "price_usd", "for_sale"],
} as const;

interface Extracted { title?: string; price_usd?: number; currency?: string; auction?: boolean; shipping_usd?: number; condition?: string; for_sale?: boolean }

function toListing(r: { url: string; title?: string | null; summary?: string; image?: string }): WebListing | null {
  let x: Extracted;
  try { x = JSON.parse(r.summary ?? "{}"); } catch { return null; }
  if (!x.for_sale || !x.price_usd || x.price_usd <= 0 || x.auction) return null;
  if (x.currency && x.currency.toUpperCase() !== "USD") return null;
  return {
    id: r.url, url: r.url, title: x.title || r.title || "", price: x.price_usd,
    shipping: x.shipping_usd ?? 0, condition: x.condition ?? "unknown", forSale: true, photo: r.image,
  };
}

export async function findListings(query: string, includeDomains: string[], numResults = 25): Promise<WebListing[]> {
  const client = exa();
  if (!client) return [];
  const res = await client.search(`${query} for sale`, {
    type: "auto",
    numResults,
    includeDomains: includeDomains.length ? includeDomains : undefined,
    contents: { summary: { query: "Extract this listing's details", schema: LISTING_SCHEMA }, maxAgeHours: 72 },
  });
  return res.results.map((r) => toListing(r as never)).filter((l): l is WebListing => !!l);
}

// Fresh crawl of one listing, for the Verifier and Flipper Check.
export async function getWebListing(url: string): Promise<WebListing | null> {
  const client = exa();
  if (!client) return null;
  const res = await client.getContents([url], {
    summary: { query: "Extract this listing's details", schema: LISTING_SCHEMA },
    maxAgeHours: 0,
  });
  const r = res.results[0];
  return r ? toListing(r as never) : null;
}
