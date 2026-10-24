import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usd, type Deal } from "@/lib/queries";

export const metadata = { title: "Deal card", robots: { index: false, follow: false } };

// 1080×1080 share card for one deal. The Marketer has Solari render it to an image for posts.
// Shows the math only, never the listing link, so the members window holds.
export default function CardPage({ params }: PageProps<"/card/[id]">) {
  return (
    <Suspense>
      <Card params={params} />
    </Suspense>
  );
}

async function Card({ params }: { params: PageProps<"/card/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const { data } = (await db()?.from("deals").select("*").eq("id", id).maybeSingle()) ?? {};
  const d = data as Deal | null;
  if (!d) notFound();
  const pay = d.deal_type === "offer" && d.offer_price ? d.offer_price : d.buy_price;
  const name = d.title.split(" - ")[0].split(/\s+/).slice(0, 7).join(" ");
  return (
    <div id="card" style={{ width: 1080, height: 1080, background: "#f4f3ef", color: "#0a0a0a", position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", padding: 80, fontFamily: "var(--font-geist-sans), Helvetica, Arial, sans-serif" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 12, background: "#e10600" }} />
      <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: "#e10600" }}>FOUND TODAY</div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginTop: 24 }}>{name}</div>
          <div style={{ fontSize: 30, color: "#555", marginTop: 16 }}>{d.condition} · {d.comps_count} comparable listings</div>
        </div>
        {d.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.photo_url} alt="" style={{ width: 300, height: 300, objectFit: "cover", borderRadius: 24, border: "2px solid #0a0a0a" }} />
        )}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ borderTop: "4px solid #0a0a0a" }}>
        {[
          [d.deal_type === "offer" ? "Offer" : "Buy at", usd(pay)],
          ["Same item resells for", `~${usd(d.market_value)}`],
          ["Fees + shipping", usd(Number(d.fees) + Number(d.shipping))],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "22px 0", borderBottom: "1px solid #ccc", fontSize: 40 }}>
            <span style={{ color: "#333" }}>{k}</span><b>{v}</b>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 28 }}>
          <span style={{ fontSize: 44, fontWeight: 700 }}>Est. net after fees</span>
          <span style={{ fontSize: 96, fontWeight: 800, color: "#e10600" }}>+{usd(d.net_profit)}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, fontSize: 32 }}>
        <b>● FLIPPER</b><span style={{ color: "#333" }}>{Math.round(d.roi * 100)}% return · Founding Seat $49</span>
      </div>
    </div>
  );
}
