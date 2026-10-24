import { waitUntil } from "@vercel/functions";
import { unwrapWebhook } from "@whop/sdk/helpers";
import type { NextRequest } from "next/server";
import { db, logAction } from "@/lib/db";
import { parsePayment } from "@/lib/whop-payment";

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

async function recordPayment(webhookId: string, p: Record<string, unknown>) {
  const pay = parsePayment(p, { seat: process.env.WHOP_SEAT_PRODUCT_ID, check: process.env.WHOP_CHECK_PRODUCT_ID });
  await db()?.from("revenue_events").upsert({
    whop_event_id: webhookId,
    payment_id: pay.paymentId,
    product: pay.title,
    product_kind: pay.kind,
    customer_email: pay.email,
    amount: pay.amount,
    raw: p,
  }, { onConflict: "whop_event_id", ignoreDuplicates: true });
  await logAction("finance", "payment_recorded", { payment_id: pay.paymentId, product: pay.title, kind: pay.kind, amount: pay.amount });
}
