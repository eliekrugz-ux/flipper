import { connection } from "next/server";
import { tick } from "@/agents/ceo";

export const maxDuration = 300;

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  await connection(); // never prerender: this runs the agents
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await tick();
  return Response.json(result);
}
