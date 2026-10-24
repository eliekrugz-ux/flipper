import { notFound } from "next/navigation";

// Plain language on purpose.
const DOCS: Record<string, { title: string; body: string[] }> = {
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

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const doc = DOCS[(await params).doc];
  if (!doc) notFound();
  return (
    <main className="wrap grid12 gap-y-6 pt-12">
      <div className="col-span-12 md:col-span-4">
        <div className="label">Legal · updated Oct 24, 2026</div>
        <h1 className="display mt-3 text-5xl">{doc.title}</h1>
      </div>
      <ol className="col-span-12 md:col-span-7 md:col-start-6 border-t-[3px] border-ink">
        {doc.body.map((p, i) => (
          <li key={p} className="grid grid-cols-[2.5rem_1fr] border-b border-hair py-4 text-ink-2">
            <span className="font-mono text-sm text-red">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-ink">{p}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
