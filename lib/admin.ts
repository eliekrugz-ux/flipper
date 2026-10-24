import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "flipper_admin";

// The cookie holds an HMAC of the password, so it can't be forged and rotating the password logs everyone out.
export function adminToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw ? createHmac("sha256", pw).update("flipper-admin-v1").digest("hex") : null;
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const token = adminToken();
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !value || value.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(token));
}
