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
}

export async function recentDeals(limit = 20): Promise<Deal[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = (await db()?.from("deals").select("*").order("created_at", { ascending: false }).limit(limit)) ?? {};
  return (data as Deal[]) ?? [];
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
