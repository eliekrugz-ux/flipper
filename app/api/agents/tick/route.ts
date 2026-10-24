import { connection } from "next/server";
import { tick } from "@/agents/ceo";
import { authorized } from "@/lib/cron-auth";

export const maxDuration = 300;

// Full agent loop, every 30 min from Supabase pg_cron (daily from Vercel Cron as a backstop).
export async function GET(request: Request) {
  await connection(); // never prerender: this runs the agents
  if (!(await authorized(request.headers.get("authorization")))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await tick();
  return Response.json(result);
}
