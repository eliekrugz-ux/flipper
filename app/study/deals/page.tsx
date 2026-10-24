import { Suspense } from "react";
import { connection } from "next/server";
import { db, getConfig } from "@/lib/db";
import { DealsForm, type RateDeal } from "./DealsForm";

export const metadata = { title: "Quick feedback", robots: { index: false, follow: false } };

// Terac Study 3 task page: participants rate real deals on appeal and trust.
export default function DealsStudyPage({ searchParams }: PageProps<"/study/deals">) {
  return (
    <main className="wrap py-10">
      <Suspense fallback={<p className="text-ink-2">Loading…</p>}>
        <Study searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Study({ searchParams }: { searchParams: PageProps<"/study/deals">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const ids = await getConfig<string[]>("study3_deals", []);
  const { data } = (await db()?.from("deals").select("id, title, photo_url, condition, buy_price, market_value, net_profit").in("id", ids)) ?? {};
  // Same order for everyone, as fixed when the study launched.
  const deals = ids.map((id) => (data ?? []).find((d) => d.id === id)).filter(Boolean) as RateDeal[];
  return (
    <DealsForm
      ids={{ submissionId: one("submissionId"), teracSubmissionId: one("teracSubmissionId"), taskId: one("taskId") }}
      deals={deals}
    />
  );
}
