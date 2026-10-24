import Link from "next/link";
import { DealCard } from "../components/DealCard";
import { recentDeals } from "@/lib/queries";

export const metadata = { title: "Track record — Flipper" };

export default async function DealsPage() {
  const deals = await recentDeals(100);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/" className="font-mono text-sm text-neutral-500">← Flipper</Link>
      <h1 className="mt-4 text-3xl font-bold">Track record</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Every deal Flipper&apos;s agents have called, newest first. Market value is the median of comparable
        listings for the exact same product, outliers removed. When no sold data is public, we use live
        listings × 0.82 and say so (&ldquo;active proxy&rdquo;).
      </p>
      <div className="mt-8 grid gap-3">
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
        {!deals.length && <p className="text-sm text-neutral-500">No deals yet.</p>}
      </div>
    </main>
  );
}
