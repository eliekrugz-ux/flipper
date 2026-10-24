import Anthropic from "@anthropic-ai/sdk";
import { db, getConfig, logAction, logDecision, setConfig } from "@/lib/db";
import { DEFAULT_WATCHLIST, run as scout } from "./scout";
import { run as pricer } from "./pricer";
import { run as verifier } from "./verifier";
import { pingIndexNow } from "./marketer";
import { run as researcher } from "./researcher";

const MODEL = "claude-sonnet-5-5";

interface State {
  dealsLast24h: number;
  revenueUsd: number;
  teracSpentUsd: number;
  watchlist: string[];
}

async function readState(): Promise<State> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const d = db();
  const [deals, revenue, studies, watchlist] = await Promise.all([
    d?.from("deals").select("id", { count: "exact", head: true }).gte("created_at", since),
    d?.from("revenue_events").select("amount"),
    d?.from("terac_studies").select("cost"),
    getConfig<string[]>("watchlist", DEFAULT_WATCHLIST),
  ]);
  return {
    dealsLast24h: deals?.count ?? 0,
    revenueUsd: (revenue?.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
    teracSpentUsd: (studies?.data ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0),
    watchlist,
  };
}

// Asks Claude to review the last tick and adjust the watchlist. Without a key, keeps the current one.
async function reviewWatchlist(state: State, yieldByProduct: Record<string, number>) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `You are the CEO agent of Flipper, a company that finds underpriced second-hand items (music gear on Reverb, plus furniture, clothing, sneakers, watches, cameras, electronics and cars on other resale sites).
State: ${JSON.stringify(state)}
Qualified deals per product this run: ${JSON.stringify(yieldByProduct)}
Return JSON only: {"add": [up to 5 specific Reverb music-gear models likely to have mispriced used listings], "remove": [watchlist entries that produced nothing and are unlikely to], "reasoning": "one or two sentences"}`,
    }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const plan = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
    add?: string[]; remove?: string[]; reasoning?: string;
  };
  const next = [...new Set([...state.watchlist.filter((w) => !plan.remove?.includes(w)), ...(plan.add ?? [])])];
  if (next.join("|") !== state.watchlist.join("|")) {
    await setConfig("watchlist", next);
    await logDecision("ceo", `Watchlist: +${plan.add?.length ?? 0} −${plan.remove?.length ?? 0}`, plan.reasoning ?? "", plan);
  }
}

export async function tick() {
  const state = await readState();
  await logAction("ceo", "tick_start", state);
  const candidates = await scout(state.watchlist, !!process.env.EXA_API_KEY);
  const deals = await pricer(candidates);

  const yieldByProduct: Record<string, number> = {};
  for (const c of candidates) yieldByProduct[c.product.title] ??= 0;
  for (const d of deals) {
    const c = candidates.find((x) => x.listing.url === d.url);
    if (c) yieldByProduct[c.product.title] += 1;
  }
  const verified = await verifier().catch((e) => {
    void logAction("verifier", "failed", { error: String(e) });
    return { checked: 0, expired: 0, verified: 0 };
  });
  // Posting runs every minute on its own schedule (/api/agents/market); the tick only pings search engines.
  if (deals.length) await pingIndexNow().catch((e) => logAction("marketer", "indexnow_failed", { error: String(e) }));
  await researcher().catch((e) => logAction("researcher", "failed", { error: String(e) }));
  // Credit rationing: the Claude watchlist review runs once every 6 hours, not every tick.
  if (new Date().getUTCHours() % 6 === 0 && new Date().getUTCMinutes() < 30) await reviewWatchlist(state, yieldByProduct).catch((e) => logAction("ceo", "review_failed", { error: String(e) }));
  const summary = { candidates: candidates.length, deals: deals.length, ...verified };
  await logAction("ceo", "tick_done", summary);
  return summary;
}
