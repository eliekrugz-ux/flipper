import { connection } from "next/server";
import { Suspense } from "react";
import { DealCard } from "../components/DealCard";
import { currentMember } from "@/lib/member";
import { liveDeals } from "@/lib/queries";
import { joinMembers } from "./actions";

export const metadata = { title: "Members — Flipper", robots: { index: false, follow: false } };

const SEAT_URL = process.env.NEXT_PUBLIC_WHOP_SEAT_URL || "#";

export default function MembersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <main className="wrap pt-12">
      <div className="label"><span className="sec-num">★</span> Founding Seat</div>
      <h1 className="display mt-3 text-6xl sm:text-7xl">Members<span className="text-red">.</span></h1>
      <Suspense fallback={<p className="mt-8 text-sm text-ink-2">Loading…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Feed({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const member = await currentMember();
  if (!member) {
    const { error } = await searchParams;
    return (
      <div className="grid12 mt-8 gap-y-6">
        <form action={joinMembers} className="panel col-span-12 md:col-span-6 grid gap-4 p-6 sm:p-8">
          <label className="grid gap-1.5">
            <span className="label">Email you used on Whop</span>
            <input name="email" type="email" required className="field" placeholder="you@example.com" />
          </label>
          {error && <p className="border-l-4 border-red bg-paper-2 p-3 text-sm">No Founding Seat found for that email. If you just paid, give it a minute and try again.</p>}
          <button className="pill w-full">Open the members feed</button>
        </form>
        <div className="col-span-12 md:col-span-5 md:col-start-8 text-ink-2">
          <p>Seat holders see every deal the moment it&apos;s found, with the listing link. The public site only shows deals after 24 hours.</p>
          <a href={SEAT_URL} className="pill-ghost mt-6">Get a seat · $49</a>
        </div>
      </div>
    );
  }
  const deals = await liveDeals(150);
  return (
    <>
      <p className="mt-4 text-ink-2">Signed in as {member}. Newest first, every listing linked. Buy only after checking the listing yourself.</p>
      <div className="mt-8 border-t-[3px] border-ink">
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
      </div>
    </>
  );
}
