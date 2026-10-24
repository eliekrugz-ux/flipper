import { db } from "./db";

// Agent routes have two callers: Vercel Cron (Bearer $CRON_SECRET) and Supabase pg_cron
// (Bearer token generated and kept in Supabase Vault, checked by the check_tick_token RPC).
export async function authorized(header: string | null): Promise<boolean> {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  const { data } = (await db()?.rpc("check_tick_token", { token })) ?? {};
  return data === true;
}
