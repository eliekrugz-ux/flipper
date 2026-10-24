import { cacheLife } from "next/cache";
import { db } from "./db";

export interface Deal {
  id: string;
  source: string;
  url: string;
  title: string;
  condition: string | null;
  buy_price: number;
  deal_type: "buy" | "offer";
  offer_price: number | null;
  photo_url: string | null;
  market_value: number;
  comp_source: string;
  comps_count: number;
  fees: number;
  shipping: number;
  net_profit: number;
  roi: number;
  confidence: number;
  final_score: number;
  status: string;
  created_at: string;
  // Set on public reads: fresh deals keep their math but lose the listing link until the members window passes.
  locked?: boolean;
  unlocks_in_h?: number;
}

// Seat holders get deals first; everyone else sees the link after this window.
export const MEMBERS_WINDOW_MS = 24 * 60 * 60 * 1000;

function forPublic(d: Deal): Deal {
  const left = new Date(d.created_at).getTime() + MEMBERS_WINDOW_MS - Date.now();
  if (left <= 0) return d;
  return { ...d, url: "", locked: true, unlocks_in_h: Math.max(1, Math.ceil(left / 36e5)) };
}

export async function recentDeals(limit = 20): Promise<Deal[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()
    ?.from("deals")
    .select("*")
    .neq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(limit)) ?? {};
  return ((data as Deal[]) ?? []).map(forPublic);
}

// Which homepage is live; the Researcher sets it from Terac Study 1.
export async function homeVariant(): Promise<"A" | "B"> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()?.from("config").select("value").eq("key", "home_variant").maybeSingle()) ?? {};
  return data?.value === "B" ? "B" : "A";
}

// Deals most people can actually buy lead the public pages: best return under the price cap.
// The CEO's operating review moves the cap (config "featured_max_buy"); this is the fallback.
export const FEATURED_MAX_BUY = 800;

export async function featuredMaxBuy(): Promise<number> {
  const { data } = (await db()?.from("config").select("value").eq("key", "featured_max_buy").maybeSingle()) ?? {};
  return Number(data?.value) || FEATURED_MAX_BUY;
}

export async function topDeals(limit = 6): Promise<Deal[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()
    ?.from("deals")
    .select("*")
    .neq("status", "expired")
    .lte("buy_price", await featuredMaxBuy())
    .order("roi", { ascending: false })
    .limit(60)) ?? {};
  return ((data as Deal[]) ?? []).sort((a, b) => featuredScore(b) - featuredScore(a)).slice(0, limit).map(forPublic);
}

// Return weighted by how much real people (Terac Study 3) said they'd buy and trust the deal.
// Unrated deals count as a neutral 3/5, so ROI alone decides until ratings exist.
export function featuredScore(d: Pick<Deal, "roi"> & { human_appeal?: number | null; human_trust?: number | null }) {
  const appeal = d.human_appeal ?? 3;
  const trust = d.human_trust ?? 3;
  return Number(d.roi) * ((Number(appeal) + Number(trust)) / 10);
}

// Members feed: everything, links included. Call only after checking membership.
export async function liveDeals(limit = 150): Promise<Deal[]> {
  const { data } = (await db()
    ?.from("deals")
    .select("*")
    .neq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(limit)) ?? {};
  return (data as Deal[]) ?? [];
}

export async function dashboardData() {
  const d = db();
  if (!d) return null;
  const since = new Date(Date.now() - 864e5).toISOString();
  const [revenue, logs, decisions, studies, deals, checks, activity, decided] = await Promise.all([
    d.from("revenue_events").select("amount, product, product_kind, created_at").order("created_at", { ascending: false }),
    d.from("agent_logs").select("agent, action, payload_json, created_at").order("created_at", { ascending: false }).limit(40),
    d.from("decisions").select("agent, decision, reasoning, created_at").order("created_at", { ascending: false }).limit(20),
    d.from("terac_studies").select("*").order("created_at", { ascending: true }),
    d.from("deals").select("id", { count: "exact", head: true }),
    d.from("checks").select("id", { count: "exact", head: true }),
    d.from("agent_logs").select("agent, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
    d.from("decisions").select("agent, created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  // Per agent: actions in the last 24h, when it last acted, and decisions it has logged.
  const agents: Record<string, { actions24h: number; lastAt: string | null; decisions: number }> = {};
  const slot = (a: string) => (agents[a] ??= { actions24h: 0, lastAt: null, decisions: 0 });
  for (const l of activity.data ?? []) {
    const s = slot(l.agent);
    s.actions24h++;
    s.lastAt ??= l.created_at;
  }
  for (const x of decided.data ?? []) slot(x.agent).decisions++;
  return {
    agents,
    revenue: revenue.data ?? [],
    logs: logs.data ?? [],
    decisions: decisions.data ?? [],
    studies: studies.data ?? [],
    dealCount: deals.count ?? 0,
    checkCount: checks.count ?? 0,
  };
}

export const usd = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
