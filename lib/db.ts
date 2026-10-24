import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-only. Returns null until Supabase env vars are set so pages still render.
export function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function logAction(agent: string, action: string, payload: unknown = {}) {
  console.log(`[${agent}] ${action}`);
  await db()?.from("agent_logs").insert({ agent, action, payload_json: payload });
}

export async function logDecision(agent: string, decision: string, reasoning: string, inputs: unknown = {}) {
  console.log(`[${agent}] DECISION ${decision}`);
  await db()?.from("decisions").insert({ agent, decision, reasoning, inputs_json: inputs });
}

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  const { data } = (await db()?.from("config").select("value").eq("key", key).maybeSingle()) ?? {};
  return (data?.value as T) ?? fallback;
}

export async function setConfig(key: string, value: unknown) {
  await db()?.from("config").upsert({ key, value });
}
