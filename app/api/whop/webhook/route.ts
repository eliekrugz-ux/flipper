import { waitUntil } from "@vercel/functions";
import { unwrapWebhook } from "@whop/sdk/helpers";
import type { NextRequest } from "next/server";
import { db, logAction } from "@/lib/db";

// Per https://docs.whop.com/developer/guides/webhooks — Standard Webhooks signature, verified by the SDK.
export async function POST(request: NextRequest): Promise<Response> {
  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);
  let event: { id?: string; type: string; data: Record<string, unknown> };
  try {
    event = unwrapWebhook(payload, { headers, key: process.env.WHOP_WEBHOOK_SECRET! });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
  if (event.type === "payment.succeeded") {
    waitUntil(recordPayment(headers["webhook-id"] ?? event.id ?? "", event.data));
  }
  return new Response("OK", { status: 200 });
}

type Money = { amount?: string } | number | string | null | undefined;
const num = (m: Money) => Number(typeof m === "object" && m ? m.amount : m) || 0;

// The payment shape depends on the webhook's api_version_date pin, so read both old and new field names.
async function recordPayment(webhookId: string, p: Record<string, unknown>) {
  const items = (p.line_items as Array<{ product_title?: string; product_id?: string }> | undefined) ?? [];
  const product = (p.product as { title?: string; id?: string } | undefined) ?? {};
  const title = items[0]?.product_title ?? product.title ?? "";
  const productId = items[0]?.product_id ?? product.id ?? (p.product_id as string | undefined) ?? null;
  const email =
    (p.customer_email as string | undefined) ??
    (p.user as { email?: string } | undefined)?.email ??
    null;
  const amount = num(p.total as Money) || num(p.usd_total as Money) || num(p.subtotal as Money) || num(p.final_amount as Money);
  const kind = productId && productId === process.env.WHOP_CHECK_PRODUCT_ID ? "check"
    : productId && productId === process.env.WHOP_SEAT_PRODUCT_ID ? "seat"
    : /check/i.test(title) ? "check" : /seat|founding/i.test(title) ? "seat" : "other";

  await db()?.from("revenue_events").upsert({
    whop_event_id: webhookId,
    payment_id: p.id as string,
    product: title,
    product_kind: kind,
    customer_email: email?.toLowerCase() ?? null,
    amount,
    raw: p,
  }, { onConflict: "whop_event_id", ignoreDuplicates: true });
  await logAction("finance", "payment_recorded", { payment_id: p.id, product: title, kind, amount });
}
