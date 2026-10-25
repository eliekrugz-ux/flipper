import { db } from "@/lib/db";

// Same upsert the study pages run; writes and deletes one test row.
(async () => {
  const d = db()!;
  const { error } = await d.from("study_responses").upsert(
    { study: "selftest", terac_submission_id: "selftest-1", answers: { ok: true } },
    { onConflict: "study,terac_submission_id", ignoreDuplicates: true },
  );
  console.log(error ? `FAIL ${error.message}` : "OK upsert");
  await d.from("study_responses").delete().eq("study", "selftest");
})();
