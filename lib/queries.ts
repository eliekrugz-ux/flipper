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

export async function topDeals(limit = 6): Promise<Deal[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()
    ?.from("deals")
    .select("*")
    .neq("status", "expired")
    .order("final_score", { ascending: false })
    .limit(limit)) ?? {};
  return ((data as Deal[]) ?? []).map(forPublic);
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
  const [revenue, logs, decisions, studies, deals, checks] = await Promise.all([
    d.from("revenue_events").select("amount, product, product_kind, created_at").order("created_at", { ascending: false }),
    d.from("agent_logs").select("agent, action, payload_json, created_at").order("created_at", { ascending: false }).limit(40),
    d.from("decisions").select("agent, decision, reasoning, created_at").order("created_at", { ascending: false }).limit(20),
    d.from("terac_studies").select("*").order("created_at", { ascending: true }),
    d.from("deals").select("id", { count: "exact", head: true }),
    d.from("checks").select("id", { count: "exact", head: true }),
  ]);
  return {
    revenue: revenue.data ?? [],
    logs: logs.data ?? [],
    decisions: decisions.data ?? [],
    studies: studies.data ?? [],
    dealCount: deals.count ?? 0,
    checkCount: checks.count ?? 0,
  };
}

export const usd = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
