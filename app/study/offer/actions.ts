"use server";

import { db } from "@/lib/db";

export interface Ids { submissionId: string; teracSubmissionId: string; taskId: string }

// Terac's completion callback: marks the participant's submission done.
const CALLBACK = process.env.TERAC_CALLBACK_URL || "https://terac.com/api/external/callback";

export async function submitOfferStudy(ids: Ids, answers: Record<string, unknown>): Promise<string> {
  const { error } = await db()!.from("study_responses").upsert(
    {
      study: "offer_page_v1",
      terac_submission_id: ids.teracSubmissionId || null,
      submission_id: ids.submissionId || null,
      task_id: ids.taskId || null,
      answers,
    },
    { onConflict: "study,terac_submission_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Couldn't save your answers, please try again.");
  const q = new URLSearchParams({ ...ids, result: "completed" });
  return `${CALLBACK}?${q}`;
}
