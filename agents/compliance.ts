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

// Used when Claude is unavailable: fixed checks that the pages cover how the product works today.
export function ruleBasedReview(docs: LegalDocs): { docs: LegalDocs; fixes: string[] } {
  const next: LegalDocs = JSON.parse(JSON.stringify(docs));
  const all = () => Object.values(next).flatMap((d) => d.body).join(" ");
  const fixes: string[] = [];
  const add = (doc: keyof LegalDocs, text: string, why: string) => {
    next[doc].body.push(text);
    fixes.push(why);
  };
  if (!/exa|web search/i.test(all())) add("disclaimer", "Some deals are found through Exa web search of resale sites that allow it; we confirm each listing before we post it.", "discovery through Exa web search wasn't disclosed");
  if (!/facebook marketplace/i.test(all())) add("disclaimer", "We never scrape Facebook Marketplace, Vinted, Mercari, Poshmark, Depop or Grailed.", "the banned-sources commitment wasn't stated");
  if (!/automated|headless|bot/i.test(all())) add("disclaimer", "We use automated browsers only to render our own images and to read pages that allow it; we never get around a site's bot protection.", "automated browsing wasn't disclosed");
  return { docs: next, fixes };
}

export async function run() {
  if (!db()) return { updated: false };
  const current = await getConfig<LegalDocs>("legal_docs", LEGAL_DEFAULTS);
  const plan = await claudeReview(current).catch(async (e) => {
    await logAction("compliance", "claude_unavailable", { error: String(e).slice(0, 200) });
    const { docs, fixes } = ruleBasedReview(current);
    return fixes.length
      ? { changed: true, docs, reasoning: `Rule-based review (Claude unavailable): ${fixes.join("; ")}.` }
      : { changed: false, docs: current, reasoning: "Rule-based review: pages cover current practices." };
  });
  return publish(plan);
}

async function claudeReview(current: LegalDocs): Promise<{ changed?: boolean; docs?: LegalDocs; reasoning?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("no ANTHROPIC_API_KEY");
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
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

async function publish(plan: { changed?: boolean; docs?: LegalDocs; reasoning?: string }) {
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
  await logDecision("compliance", "Updated legal pages", plan.reasoning ?? "", { docs: plan.docs });
  return { updated: true };
}
