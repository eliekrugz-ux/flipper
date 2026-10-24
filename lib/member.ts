import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const MEMBER_COOKIE = "flipper_member";

// Cookie = "<email>.<hmac>" so it can't be forged without the server secret.
function sign(email: string): string {
  const key = process.env.MEMBER_SECRET ?? process.env.CRON_SECRET ?? "";
  return createHmac("sha256", key).update(`member:${email}`).digest("hex");
}

export function memberToken(email: string): string {
  return `${Buffer.from(email).toString("base64url")}.${sign(email)}`;
}

// A seat comes from a Whop purchase, or from the comp list (config "comp_seats"), which grants
// access without a payment so it never counts as revenue.
export async function hasSeat(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  const d = db();
  const [{ data: paid }, { data: comp }] = await Promise.all([
    d!.from("revenue_events").select("id").eq("customer_email", e).eq("product_kind", "seat").limit(1),
    d!.from("config").select("value").eq("key", "comp_seats").maybeSingle(),
  ]);
  const comps = ((comp?.value as string[]) ?? []).map((x) => x.toLowerCase());
  return !!paid?.length || comps.includes(e);
}

export async function currentMember(): Promise<string | null> {
  const raw = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!raw) return null;
  const [b64, mac] = raw.split(".");
  if (!b64 || !mac) return null;
  const email = Buffer.from(b64, "base64url").toString();
  const expected = sign(email);
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return email;
}
