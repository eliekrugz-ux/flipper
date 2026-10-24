import { describe, expect, it } from "vitest";
import { clampChanges, ruleBasedPlan } from "./operator";
import { ruleBasedReview, safeToPublish } from "./compliance";
import { LEGAL_DEFAULTS } from "@/lib/legal";

describe("CEO lever guardrails", () => {
  it("clamps every change into its allowed range and drops unknown levers", () => {
    expect(clampChanges({ min_confidence: 10, min_profit_usd: 500, cadence_bluesky: 1, made_up: 3 }))
      .toEqual({ min_confidence: 55, min_profit_usd: 60, cadence_bluesky: 4 });
  });
});

describe("compliance guardrails", () => {
  it("accepts the starting text", () => {
    expect(safeToPublish(LEGAL_DEFAULTS)).toBeNull();
  });
  it("refuses a rewrite that drops a required protection", () => {
    const weakened = { ...LEGAL_DEFAULTS, disclaimer: { title: "Disclaimer", body: ["Great deals, guaranteed."] } };
    expect(safeToPublish(weakened)).toMatch(/required protection/);
  });
});

describe("CEO rule-based fallback", () => {
  const levers = { min_profit_usd: 20, min_roi: 0.3, min_confidence: 60, featured_max_buy: 800, cadence_bluesky: 6, cadence_telegram: 2 };
  it("widens the featured cap when few deals qualify and slows a low-click channel", () => {
    const m = { deals_24h: 40, deals_under_800: 3, median_buy: 400, expired_24h: 2, channels: { telegram: { posts: 30, clicks: 3 } }, revenue_usd: 0, sales: 0, terac: [] };
    const p = ruleBasedPlan(levers, m);
    expect(p.changes).toEqual({ featured_max_buy: 1000, cadence_telegram: 4 });
  });
  it("holds when everything is within targets", () => {
    const m = { deals_24h: 40, deals_under_800: 20, median_buy: 400, expired_24h: 2, channels: { telegram: { posts: 30, clicks: 30 } }, revenue_usd: 0, sales: 0, terac: [] };
    expect(ruleBasedPlan(levers, m).changes).toEqual({});
  });
});

describe("compliance rule-based fallback", () => {
  it("adds missing disclosures without dropping protections, then has nothing left to fix", () => {
    const { docs, fixes } = ruleBasedReview(LEGAL_DEFAULTS);
    expect(fixes.length).toBeGreaterThan(0);
    expect(safeToPublish(docs)).toBeNull();
    expect(ruleBasedReview(docs).fixes).toEqual([]);
  });
});
