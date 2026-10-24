import Anthropic from "@anthropic-ai/sdk";
import { db, getConfig, logAction, logDecision, setConfig } from "@/lib/db";
import { LEGAL_DEFAULTS, type LegalDocs } from "@/lib/legal";

// Compliance agent: checks the legal pages against what the product does today and rewrites
// them when they've drifted. Guardrails keep the protections it may never weaken.
const MODEL = "claude-sonnet-5-5";
const MUST_KEEP = [/not financial advice/i, /no guaranteed profit/i, /own risk/i, /7 days/i, /whop/i];

export function safeToPublish(docs: LegalDocs): string | null {
  for (const key of ["terms", "refunds", "disclaimer"] as const) {
    if (!docs[key]?.body?.length) return `missing ${key}`;
  }
  const all = Object.values(docs).flatMap((d) => d.body).join(" ");
  const missing = MUST_KEEP.find((re) => !re.test(all));
  return missing ? `would drop a required protection (${missing})` : null;
}

export async function productFacts() {
  const d = db()!;
  const { data: sources } = await d.from("deals").select("source").neq("status", "expired");
  return {
    products: { founding_seat: "$49 one-time, capped at 50 seats, every deal 24h before the public", check: "$7 per listing verdict" },
    deal_sources_live: [...new Set((sources ?? []).map((s) => s.source))],
    discovery: "Reverb official API; Exa web search of allowed resale sites (Chairish, 1stDibs, KEH, MPB, Swappa, Chrono24, cars.com and others); eBay Browse API pending approval",
    never_scraped: ["Facebook Marketplace", "Vinted", "Mercari", "Poshmark", "Depop", "Grailed"],
    automation: "Solari headless browsers render marketing images; bot walls are detected and never bypassed",
    comps: "market value = median of live listings for the same item x 0.82 when sold data isn't public",
    payments: "Whop processes all payments and refunds",
  };
}

export async function run() {
  if (!process.env.ANTHROPIC_API_KEY || !db()) return { updated: false };
  const current = await getConfig<LegalDocs>("legal_docs", LEGAL_DEFAULTS);
  const facts = await productFacts();
  const msg = await new Anthropic().messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{
      role: "user",
      content: `You are the compliance agent for Flipper. Compare the legal pages to the product facts. If anything is inaccurate or missing (a source, price, product, or practice the pages don't cover correctly), rewrite only what's needed, in plain language. Keep: not financial advice, no guaranteed profit, buy at your own risk, the 7-day refund windows, Whop as processor. Never weaken a buyer protection.
Facts: ${JSON.stringify(facts)}
Current pages: ${JSON.stringify(current)}
Return JSON only: {"changed": true|false, "docs": {same shape as current pages}, "reasoning": "one or two sentences: what was wrong and what changed"}`,
    }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const plan = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { changed?: boolean; docs?: LegalDocs; reasoning?: string };
  if (!plan.changed || !plan.docs) {
    await logAction("compliance", "review_ok", { reasoning: plan.reasoning });
    return { updated: false };
  }
  const problem = safeToPublish(plan.docs);
  if (problem) {
    await logAction("compliance", "rewrite_rejected", { problem, reasoning: plan.reasoning });
    return { updated: false };
  }
  await setConfig("legal_docs", plan.docs);
  await setConfig("legal_updated_at", new Date().toISOString());
  await logDecision("compliance", "Updated legal pages", plan.reasoning ?? "", { facts });
  return { updated: true };
}
