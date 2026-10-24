"use server";

import { db } from "@/lib/db";

export interface Ids { submissionId: string; teracSubmissionId: string; taskId: string }

// Terac's completion callback: marks the participant's submission done.
const CALLBACK = process.env.TERAC_CALLBACK_URL || "https://terac.com/api/external/callback";

export async function submitOfferStudy(ids: Ids, answers: Record<string, unknown>): Promise<string> {
  return submitStudy("offer_page_v1", ids, answers);
}

// Saves one participant's answers, then returns Terac's completion URL for the browser to visit.
export async function submitStudy(study: string, ids: Ids, answers: Record<string, unknown>): Promise<string> {
  const { error } = await db()!.from("study_responses").upsert(
    {
      study,
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
