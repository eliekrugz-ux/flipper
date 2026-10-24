// Normalizes a Whop payment.succeeded payload. The shape depends on the webhook's api_version_date pin
// (older pins: product/user/total as numbers; newer: line_items/customer_email/total as {amount}), so read both.

type Money = { amount?: string } | number | string | null | undefined;
const num = (m: Money) => Number(typeof m === "object" && m ? m.amount : m) || 0;

export interface ParsedPayment {
  paymentId: string;
  title: string;
  productId: string | null;
  kind: "seat" | "check" | "other";
  email: string | null;
  amount: number;
}

export function parsePayment(
  p: Record<string, unknown>,
  ids: { seat?: string; check?: string } = {},
): ParsedPayment {
  const items = (p.line_items as Array<{ product_title?: string; product_id?: string }> | undefined) ?? [];
  const product = (p.product as { title?: string; id?: string } | undefined) ?? {};
  const title = items[0]?.product_title ?? product.title ?? "";
  const productId = items[0]?.product_id ?? product.id ?? (p.product_id as string | undefined) ?? null;
  const email = (p.customer_email as string | undefined) ?? (p.user as { email?: string } | undefined)?.email ?? null;
  const amount = num(p.total as Money) || num(p.usd_total as Money) || num(p.subtotal as Money) || num(p.final_amount as Money);
  const kind = productId && productId === ids.check ? "check"
    : productId && productId === ids.seat ? "seat"
    : /check/i.test(title) ? "check" : /seat|founding/i.test(title) ? "seat" : "other";
  return { paymentId: p.id as string, title, productId, kind, email: email?.toLowerCase() ?? null, amount };
}
