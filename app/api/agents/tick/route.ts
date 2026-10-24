import { connection } from "next/server";
import { tick } from "@/agents/ceo";
import { db } from "@/lib/db";

export const maxDuration = 300;

// Two callers: Vercel Cron (Bearer $CRON_SECRET) and Supabase pg_cron every 30 min
// (Bearer token generated and kept in Supabase Vault, checked by the check_tick_token RPC).
async function authorized(header: string | null): Promise<boolean> {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true;
  const { data } = (await db()?.rpc("check_tick_token", { token })) ?? {};
  return data === true;
}

export async function GET(request: Request) {
  await connection(); // never prerender: this runs the agents
  if (!(await authorized(request.headers.get("authorization")))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await tick();
  return Response.json(result);
}
