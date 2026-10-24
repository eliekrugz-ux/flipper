import { loadPricingConfig } from "@/agents/pricer";
import { runCheck, UnsupportedListing } from "@/lib/check";
import { db, logAction } from "@/lib/db";


// A paid Flipper Check: the buyer gives the email they used on Whop; each Check payment is one credit.
export async function POST(request: Request) {
  const { url, email } = (await request.json()) as { url?: string; email?: string };
  if (!url || !email) return Response.json({ error: "Listing URL and checkout email are required." }, { status: 400 });

  const d = db();
  if (!d) return Response.json({ error: "Checks are temporarily offline." }, { status: 503 });

  const { data: credit } = await d
    .from("revenue_events")
    .select("id, checks_used")
    .eq("customer_email", email.trim().toLowerCase())
    .eq("product_kind", "check")
    .eq("checks_used", 0)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!credit) {
    return Response.json({ error: "No unused Flipper Check found for that email. Buy one first, then come back." }, { status: 402 });
  }

  try {
    const result = await runCheck(url, await loadPricingConfig());
    await d.from("revenue_events").update({ checks_used: 1 }).eq("id", credit.id);
    await d.from("checks").insert({
      whop_user_id: email.trim().toLowerCase(),
      listing_url: url,
      verdict: result.verdict,
      offer_price: result.offerPrice ?? null,
      details_json: result,
      paid: true,
    });
    await logAction("sales", "check_delivered", { url, verdict: result.verdict });
    return Response.json(result);
  } catch (e) {
    // Credit is only consumed on success.
    const message = e instanceof UnsupportedListing ? e.message : "Couldn't read that listing. Check the link and try again.";
    await logAction("sales", "check_failed", { url, error: String(e) });
    return Response.json({ error: message }, { status: 422 });
  }
}
