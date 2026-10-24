import { db, getConfig, logAction, logDecision, setConfig } from "@/lib/db";

// Researcher: turns Terac participants' answers into a product change.
// Study 1 answers arrive on our own task page (/study/offer), so scoring costs no Terac credits.
const STUDY = "offer_page_v1";
const OPPORTUNITY = "gt913ivxurzan2ddi6w51d8f";
const MIN_TO_DECIDE = 3;
const TARGET = 5;

type V = "A" | "B";
interface Answers { [k: string]: number | string | undefined }

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : 0);

export function score(rows: Answers[]) {
  const per = (v: V) => {
    const pick = (k: string) => rows.map((r) => Number(r[`${v}_${k}`])).filter((n) => n >= 1 && n <= 5);
    const prefer = rows.filter((r) => r.prefer === v).length;
    return {
      clarity: mean(pick("clarity")),
      trust: mean(pick("trust")),
      would_pay: mean(pick("pay")),
      preferred_pct: rows.length ? Math.round((prefer / rows.length) * 100) : 0,
    };
  };
  const A = per("A");
  const B = per("B");
  // Preference decides; a tie goes to willingness to pay, then to keeping the live page.
  const winner: V =
    B.preferred_pct !== A.preferred_pct ? (B.preferred_pct > A.preferred_pct ? "B" : "A")
    : B.would_pay > A.would_pay ? "B" : "A";
  return { A, B, winner };
}

export async function run() {
  const d = db();
  if (!d) return { responses: 0 };
  const { data } = await d.from("study_responses").select("answers").eq("study", STUDY);
  const rows = (data ?? []).map((r) => r.answers as Answers);
  if (rows.length < MIN_TO_DECIDE) {
    await logAction("researcher", "waiting", { study: STUDY, responses: rows.length, need: MIN_TO_DECIDE });
    return { responses: rows.length };
  }

  const { A, B, winner } = score(rows);
  const final = rows.length >= TARGET;
  const prev = await getConfig<{ winner?: V; n?: number }>("study1_state", {});
  if (prev.winner === winner && prev.n === rows.length) return { responses: rows.length, winner };

  const current = await getConfig<V>("home_variant", "A");
  const why = String(rows.map((r) => r.why).filter(Boolean).slice(0, 3).join(" | ")).slice(0, 400);
  const change = winner === "B"
    ? "Homepage switched to version B: real deals and profit up top, $7 Check as the main button."
    : "Kept the current homepage (version A); version B scored lower.";
  await d.from("terac_studies").update({
    status: final ? "complete" : "collecting",
    before_metric: A,
    after_metric: winner === "B" ? B : A,
    raw_submissions: rows,
    summary: `${rows.length} participants. A: preferred ${A.preferred_pct}%, would pay ${A.would_pay}/5. B: preferred ${B.preferred_pct}%, would pay ${B.would_pay}/5.${why ? ` Said: ${why}` : ""}`,
    change_made: change,
  }).eq("opportunity_id", OPPORTUNITY);

  if (winner !== current) await setConfig("home_variant", winner);
  await setConfig("study1_state", { winner, n: rows.length });
  await logDecision("ceo", `Study 1 ${final ? "final" : "provisional"}: homepage ${winner}`,
    `${rows.length} of ${TARGET} Terac participants. Preference A ${A.preferred_pct}% vs B ${B.preferred_pct}%; would pay A ${A.would_pay} vs B ${B.would_pay}. ${change}`,
    { A, B, winner, responses: rows.length });
  return { responses: rows.length, winner };
}
