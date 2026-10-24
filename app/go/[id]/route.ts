import { NextResponse, connection } from "next/server";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

const TARGETS: Record<string, string> = { deals: "/deals", check: "/check" };

// Tracked link used in every social post: counts the click, then lands on the page the post sells.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const d = db();
  const { data } = (await d?.from("posts").select("id, channel, clicks").eq("id", id).maybeSingle()) ?? {};
  if (data) await d!.from("posts").update({ clicks: (data.clicks ?? 0) + 1 }).eq("id", id);
  const path = TARGETS[new URL(req.url).searchParams.get("to") ?? ""] ?? "/";
  return NextResponse.redirect(`${SITE_URL}${path}?ref=${data?.channel ?? "post"}`, 302);
}
