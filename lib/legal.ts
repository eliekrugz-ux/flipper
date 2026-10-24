import { cacheLife } from "next/cache";
import { db } from "./db";

export type LegalDocs = Record<"terms" | "refunds" | "disclaimer", { title: string; body: string[] }>;

// The starting text. The compliance agent keeps the live version in config "legal_docs".
// Plain language on purpose.
export const LEGAL_DEFAULTS: LegalDocs = {
  terms: {
    title: "Terms of Service",
    body: [
      "Flipper sells information: deal alerts (Founding Seat) and listing analyses (Flipper Check). We don't sell, hold or ship any of the items we analyze.",
      "Payments are processed by Whop. By purchasing you also agree to Whop's terms.",
      "Deals link to third-party marketplaces (Reverb, Discogs, eBay and others). Any purchase you make there is between you and that seller, under that marketplace's rules.",
      "Prices, availability and condition can change at any time after we publish. Always confirm on the listing before you buy.",
      "Founding Seats are personal. Don't resell or republish Flipper's deal posts.",
      "We may update these terms; the version on this page is the one in effect.",
    ],
  },
  refunds: {
    title: "Refund Policy",
    body: [
      "Flipper Check: if a Check fails to return a verdict, your credit isn't used and you can try again. If you paid and never got a result, contact us through Whop within 7 days for a full refund.",
      "Founding Seat: full refund within 7 days of purchase if you're not happy, no questions asked. After that, seats are non-refundable.",
      "We can't refund losses on items you bought or resold. See the disclaimer.",
      "Refunds are issued through Whop to your original payment method.",
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    body: [
      "Not financial advice. Flipper's verdicts are estimates produced by software from public listing data.",
      "No guaranteed profit. Market value is an estimate; resale prices, fees and shipping costs vary. When sold-price data isn't public we estimate from live listings and label it \"active proxy\".",
      "Buy at your own risk. Inspect listings, read seller feedback and use marketplace buyer protection.",
      "Flipper only uses official marketplace APIs and public web search. We don't scrape sites that prohibit it.",
    ],
  },
};

export async function legalDocs(): Promise<{ docs: LegalDocs; updatedAt: string | null }> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()?.from("config").select("key, value").in("key", ["legal_docs", "legal_updated_at"])) ?? {};
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  return { docs: (get("legal_docs") as LegalDocs) ?? LEGAL_DEFAULTS, updatedAt: (get("legal_updated_at") as string) ?? null };
}
