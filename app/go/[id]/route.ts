import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Tracked link used in every social post: counts the click, then lands on the deals page.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const d = db();
  const { data } = (await d?.from("posts").select("id, channel, clicks").eq("id", id).maybeSingle()) ?? {};
  if (data) await d!.from("posts").update({ clicks: (data.clicks ?? 0) + 1 }).eq("id", id);
  return NextResponse.redirect(`${SITE_URL}/deals?ref=${data?.channel ?? "post"}`, 302);
}
