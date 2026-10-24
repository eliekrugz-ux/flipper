"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAction } from "@/lib/db";
import { MEMBER_COOKIE, hasSeat, memberToken } from "@/lib/member";

export async function joinMembers(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !(await hasSeat(email))) redirect("/members?error=1");
  (await cookies()).set(MEMBER_COOKIE, memberToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  await logAction("sales", "member_signed_in", { email });
  redirect("/members");
}
