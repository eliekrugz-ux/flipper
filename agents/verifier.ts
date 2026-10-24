import { db, logAction } from "@/lib/db";
import { pool } from "@/lib/pool";
import { getListing, listingIdFromUrl } from "@/lib/sources/reverb";

// Re-checks every live deal against Reverb: sold, ended or repriced above our buy price → expired.
// TODO(solari): add a headless-browser screenshot per deal once SOLARI_API_KEY is available.
export async function run() {
  const d = db();
  if (!d) return { checked: 0, expired: 0 };
  const { data: deals } = await d
    .from("deals")
    .select("id, url, buy_price, status")
    .neq("status", "expired")
    .eq("source", "reverb");

  let expired = 0;
  let verified = 0;
  await pool(deals ?? [], 8, async (deal) => {
    const id = listingIdFromUrl(deal.url);
    if (!id) return;
    let reason: string | null = null;
    try {
      const l = await getListing(id);
      if (l.state !== "live") reason = `listing ${l.state}`;
      else if (l.price > Number(deal.buy_price) + 0.5) reason = `price rose to $${l.price}`;
    } catch {
      reason = "listing removed";
    }
    if (reason) {
      expired++;
      await d.from("deals").update({ status: "expired" }).eq("id", deal.id);
      await logAction("verifier", "expired", { url: deal.url, reason });
    } else if (deal.status === "found") {
      verified++;
      await d.from("deals").update({ status: "verified" }).eq("id", deal.id);
    }
  });
  await logAction("verifier", "done", { checked: deals?.length ?? 0, expired, verified });
  return { checked: deals?.length ?? 0, expired, verified };
}
