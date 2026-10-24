import Anthropic from "@anthropic-ai/sdk";
import { db, getConfig, logAction, logDecision, setConfig } from "@/lib/db";

// The CEO's operating review: every 2 hours Claude reads the live numbers and moves the company's
// levers itself. Every lever has hard bounds, so no single call can wreck quality or spam a channel.
const MODEL = "claude-sonnet-5-5";

export const LEVERS = {
  min_profit_usd: { min: 15, max: 60, fallback: 20, what: "Pricer: minimum est. net profit for a deal to post" },
  min_roi: { min: 0.2, max: 0.6, fallback: 0.3, what: "Pricer: minimum return on the buy price" },
  min_confidence: { min: 55, max: 80, fallback: 60, what: "Pricer: minimum comp confidence (0-100)" },
  featured_max_buy: { min: 200, max: 2000, fallback: 800, what: "Homepage/posts: highest buy price that gets featured" },
  cadence_bluesky: { min: 4, max: 30, fallback: 6, what: "Marketer: minutes between Bluesky posts" },
  cadence_telegram: { min: 2, max: 30, fallback: 2, what: "Marketer: minutes between Telegram posts" },
} as const;
type Lever = keyof typeof LEVERS;

export function clampChanges(raw: Record<string, unknown>): Partial<Record<Lever, number>> {
  const out: Partial<Record<Lever, number>> = {};
  for (const [k, v] of Object.entries(raw)) {
    const spec = LEVERS[k as Lever];
    const n = Number(v);
    if (!spec || !Number.isFinite(n)) continue;
    out[k as Lever] = Math.min(spec.max, Math.max(spec.min, n));
  }
  return out;
}

async function currentLevers() {
  const cadence = await getConfig<Record<string, number>>("marketing_cadence", {});
  return {
    min_profit_usd: await getConfig("min_profit_usd", LEVERS.min_profit_usd.fallback),
    min_roi: await getConfig("min_roi", LEVERS.min_roi.fallback),
    min_confidence: await getConfig("min_confidence", LEVERS.min_confidence.fallback),
    featured_max_buy: await getConfig("featured_max_buy", LEVERS.featured_max_buy.fallback),
    cadence_bluesky: cadence.bluesky ?? LEVERS.cadence_bluesky.fallback,
    cadence_telegram: cadence.telegram ?? LEVERS.cadence_telegram.fallback,
  } as Record<Lever, number>;
}

async function metrics() {
  const d = db()!;
  const since = new Date(Date.now() - 864e5).toISOString();
  const [deals, posts, revenue, studies, expired] = await Promise.all([
    d.from("deals").select("category, buy_price, net_profit, roi, confidence").neq("status", "expired").gte("created_at", since),
    d.from("posts").select("channel, clicks").gte("created_at", since),
    d.from("revenue_events").select("amount, product_kind"),
    d.from("terac_studies").select("name, status, summary"),
    d.from("deals").select("id", { count: "exact", head: true }).eq("status", "expired").gte("created_at", since),
  ]);
  const byChannel: Record<string, { posts: number; clicks: number }> = {};
  for (const p of posts.data ?? []) {
    byChannel[p.channel] ??= { posts: 0, clicks: 0 };
    byChannel[p.channel].posts++;
    byChannel[p.channel].clicks += p.clicks ?? 0;
  }
  const live = deals.data ?? [];
  return {
    deals_24h: live.length,
    deals_under_800: live.filter((x) => Number(x.buy_price) <= 800).length,
    median_buy: live.map((x) => Number(x.buy_price)).sort((a, b) => a - b)[Math.floor(live.length / 2)] ?? 0,
    expired_24h: expired.count ?? 0,
    channels: byChannel,
    revenue_usd: (revenue.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    sales: (revenue.data ?? []).length,
    terac: studies.data ?? [],
  };
}

type Metrics = Awaited<ReturnType<typeof metrics>>;

// Used when Claude is unavailable: the same levers, moved by fixed rules on the same numbers.
export function ruleBasedPlan(levers: Record<Lever, number>, m: Metrics): { changes: Record<string, number>; reasoning: string } {
  const changes: Record<string, number> = {};
  const why: string[] = [];
  if (m.deals_under_800 < 6 && levers.featured_max_buy < LEVERS.featured_max_buy.max) {
    changes.featured_max_buy = levers.featured_max_buy + 200;
    why.push(`only ${m.deals_under_800} featured-eligible deals, so the price cap rises to show more`);
  }
  if (m.deals_24h > 0 && m.expired_24h / m.deals_24h > 0.25) {
    changes.min_confidence = levers.min_confidence + 5;
    why.push(`${m.expired_24h} of ${m.deals_24h} deals expired within a day, so the confidence bar goes up`);
  }
  for (const ch of ["bluesky", "telegram"] as const) {
    const c = m.channels[ch];
    const key = `cadence_${ch}` as Lever;
    if (c && c.posts >= 10 && c.clicks / c.posts < 0.2) {
      changes[key] = levers[key] + 2;
      why.push(`${ch} averaged ${(c.clicks / c.posts).toFixed(2)} clicks per post, so it posts less often`);
    }
  }
  return { changes, reasoning: why.length ? `Rule-based review (Claude unavailable): ${why.join("; ")}.` : "Rule-based review: all levers within targets." };
}

export async function run() {
  if (!db()) return { changed: 0 };
  const [levers, m] = await Promise.all([currentLevers(), metrics()]);
  const plan = await claudePlan(levers, m).catch(async (e) => {
    await logAction("ceo", "claude_unavailable", { error: String(e).slice(0, 200) });
    return ruleBasedPlan(levers, m);
  });
  return apply(plan, levers, m);
}

async function claudePlan(levers: Record<Lever, number>, m: Metrics) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("no ANTHROPIC_API_KEY");
  const msg = await new Anthropic().messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{
      role: "user",
      content: `You are the CEO agent of Flipper, a company that finds underpriced second-hand listings and sells the deals (Founding Seat $49, Check $7). Review the last 24 hours and decide whether to move any lever. Change a lever only with a clear reason from the numbers; holding steady is often right.
Levers (current value, allowed range, what it does):
${Object.entries(LEVERS).map(([k, s]) => `- ${k} = ${levers[k as Lever]} (range ${s.min}-${s.max}): ${s.what}`).join("\n")}
Metrics: ${JSON.stringify(m)}
Return JSON only: {"changes": {"<lever>": <new value>, ...}, "reasoning": "two or three sentences citing the numbers"}`,
    }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { changes?: Record<string, unknown>; reasoning?: string };
}

async function apply(plan: { changes?: Record<string, unknown>; reasoning?: string }, levers: Record<Lever, number>, m: Metrics) {
  const changes = Object.fromEntries(
    Object.entries(clampChanges(plan.changes ?? {})).filter(([k, v]) => v !== levers[k as Lever]),
  ) as Partial<Record<Lever, number>>;

  if (!Object.keys(changes).length) {
    await logAction("ceo", "operating_review_hold", { reasoning: plan.reasoning, levers, metrics: m });
    return { changed: 0 };
  }
  const cadence = await getConfig<Record<string, number>>("marketing_cadence", {});
  for (const [k, v] of Object.entries(changes)) {
    if (k === "cadence_bluesky") cadence.bluesky = v;
    else if (k === "cadence_telegram") cadence.telegram = v;
    else await setConfig(k, v);
  }
  if ("cadence_bluesky" in changes || "cadence_telegram" in changes) await setConfig("marketing_cadence", cadence);
  const summary = Object.entries(changes).map(([k, v]) => `${k} ${levers[k as Lever]} → ${v}`).join(", ");
  await logDecision("ceo", `Operating review: ${summary}`, plan.reasoning ?? "", { before: levers, changes, metrics: m });
  return { changed: Object.keys(changes).length };
}
