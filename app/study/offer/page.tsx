import { Suspense } from "react";
import { connection } from "next/server";
import { topDeals } from "@/lib/queries";
import { StudyForm } from "./StudyForm";

export const metadata = { title: "Quick feedback", robots: { index: false, follow: false } };

// Terac Study 1 task page: participants compare two versions of the Flipper offer page.
export default function OfferStudyPage({ searchParams }: PageProps<"/study/offer">) {
  return (
    <main className="wrap py-10">
      <Suspense fallback={<p className="text-ink-2">Loading…</p>}>
        <Study searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Study({ searchParams }: { searchParams: PageProps<"/study/offer">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const deals = (await topDeals(3)).map((d) => ({ title: d.title, buy: d.buy_price, mv: d.market_value, net: d.net_profit }));
  return (
    <StudyForm
      ids={{ submissionId: one("submissionId"), teracSubmissionId: one("teracSubmissionId"), taskId: one("taskId") }}
      deals={deals}
    />
  );
}
