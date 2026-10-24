// eBay Browse API (official). Spec: developer.ebay.com/develop/api/spec/browse_api.json
// Application token via client-credentials grant with the public scope. Returns ACTIVE listings only,
// so comps are always "active_proxy" (median × 0.82), same as Reverb.

const API = "https://api.ebay.com/buy/browse/v1";
const TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const SCOPE = "https://api.ebay.com/oauth/api_scope";

let cached: { token: string; expires: number } | null = null;

export function ebayEnabled(): boolean {
  return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

async function token(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: SCOPE }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`eBay token ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

export interface EbayListing {
  id: string;
  title: string;
  price: number;
  shipping: number;
  localPickupOnly: boolean;
  offersEnabled: boolean;
  condition: string;
  url: string;
  photo?: string;
  epid?: string;
  categoryId?: string;
}

type RawSummary = {
  itemId: string;
  title: string;
  price?: { value: string; currency: string };
  condition?: string;
  shippingOptions?: { shippingCost?: { value: string } }[];
  itemWebUrl: string;
  image?: { imageUrl: string };
  epid?: string;
  leafCategoryIds?: string[];
  buyingOptions?: string[];
};

function toListing(s: RawSummary): EbayListing | null {
  if (!s.price || s.price.currency !== "USD") return null;
  const ship = s.shippingOptions?.[0]?.shippingCost?.value;
  return {
    id: s.itemId,
    title: s.title,
    price: Number(s.price.value),
    shipping: ship != null ? Number(ship) : 0,
    localPickupOnly: ship == null,
    offersEnabled: !!s.buyingOptions?.includes("BEST_OFFER"),
    condition: s.condition ?? "Used",
    url: s.itemWebUrl.split("?")[0],
    photo: s.image?.imageUrl,
    epid: s.epid,
    categoryId: s.leafCategoryIds?.[0],
  };
}

// Used, Buy It Now, located in the US. Up to 200 per call (spec allows limit up to 200).
export async function searchUsed(q: string, opts: { epid?: string; categoryIds?: string; limit?: number } = {}): Promise<EbayListing[]> {
  const params = new URLSearchParams({
    filter: "conditions:{USED},buyingOptions:{FIXED_PRICE},itemLocationCountry:US,priceCurrency:USD",
    limit: String(opts.limit ?? 200),
  });
  if (q) params.set("q", q);
  if (opts.epid) params.set("epid", opts.epid);
  if (opts.categoryIds) params.set("category_ids", opts.categoryIds);
  const r = await fetch(`${API}/item_summary/search?${params}`, {
    headers: {
      Authorization: `Bearer ${await token()}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "X-EBAY-C-ENDUSERCTX": "contextualLocation=country%3DUS%2Czip%3D10001",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`eBay search ${r.status} ${q}`);
  const j = (await r.json()) as { itemSummaries?: RawSummary[] };
  return (j.itemSummaries ?? []).map(toListing).filter((l): l is EbayListing => !!l && l.price > 0);
}

export async function getItem(itemId: string): Promise<EbayListing | null> {
  const r = await fetch(`${API}/item/${encodeURIComponent(itemId)}`, {
    headers: { Authorization: `Bearer ${await token()}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`eBay getItem ${r.status}`);
  return toListing((await r.json()) as RawSummary);
}

export function itemIdFromUrl(url: string): string | null {
  const legacy = url.match(/ebay\.com\/itm\/(?:[^/]+\/)?(\d{9,})/)?.[1];
  return legacy ? `v1|${legacy}|0` : null;
}
