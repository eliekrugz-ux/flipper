import { connection } from "next/server";
import { run } from "@/agents/marketer";
import { authorized } from "@/lib/cron-auth";

export const maxDuration = 60;

// Hit every minute by Supabase pg_cron; the Marketer decides which channels are due.
export async function GET(request: Request) {
  await connection();
  if (!(await authorized(request.headers.get("authorization")))) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await run());
}
