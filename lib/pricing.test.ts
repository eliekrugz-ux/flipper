import { describe, expect, it } from "vitest";
import { confidence, maxBuyPrice, median, priceDeal, removeOutliers, verdict } from "./pricing";

describe("median", () => {
  it("handles odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("removeOutliers", () => {
  it("drops values outside 1.5×IQR", () => {
    expect(removeOutliers([100, 105, 110, 98, 102, 900])).not.toContain(900);
  });
  it("keeps small samples untouched", () => {
    expect(removeOutliers([10, 1000])).toEqual([10, 1000]);
  });
  it("ignores zero and non-finite prices", () => {
    expect(removeOutliers([0, NaN, 50])).toEqual([50]);
  });
});

describe("priceDeal", () => {
  const comps = [300, 310, 295, 305, 320, 290, 300, 315, 2000];

  it("computes the brief's formula with sold comps", () => {
    const r = priceDeal({ platform: "reverb", buyPrice: 180, shipping: 20, comps, compSource: "sold" });
    // median of comps without the 2000 outlier = 302.5
    expect(r.marketValue).toBe(302.5);
    expect(r.fees).toBeCloseTo(302.5 * 0.0819, 2);
    expect(r.netProfit).toBeCloseTo(302.5 - 302.5 * 0.0819 - 20 - 180 - 5, 2);
    expect(r.compsCount).toBe(8);
    expect(r.qualifies).toBe(true);
  });

  it("discounts active listings by 0.82", () => {
    const r = priceDeal({ platform: "ebay", buyPrice: 100, shipping: 0, comps: [200, 200, 200], compSource: "active_proxy" });
    expect(r.marketValue).toBe(164);
  });

  it("rejects thin profit", () => {
    const r = priceDeal({ platform: "ebay", buyPrice: 280, shipping: 15, comps, compSource: "sold" });
    expect(r.qualifies).toBe(false);
  });
});

describe("confidence", () => {
  it("is 0 with no comps and caps proxy data at 70", () => {
    expect(confidence([], "sold")).toBe(0);
    expect(confidence(Array(20).fill(100), "active_proxy", 1)).toBeLessThanOrEqual(70);
  });
  it("rewards more, tighter comps", () => {
    expect(confidence(Array(10).fill(100), "sold")).toBeGreaterThan(confidence([80, 140], "sold"));
  });
});

describe("verdict", () => {
  const comps = [300, 310, 295, 305, 320, 290, 300, 315];
  it("says BUY when the deal qualifies", () => {
    const r = priceDeal({ platform: "reverb", buyPrice: 150, shipping: 20, comps, compSource: "sold" });
    expect(verdict(r, 150).verdict).toBe("BUY");
  });
  it("suggests an OFFER that would qualify", () => {
    const r = priceDeal({ platform: "reverb", buyPrice: 240, shipping: 20, comps, compSource: "sold" });
    const v = verdict(r, 240);
    expect(v.verdict).toBe("OFFER");
    const again = priceDeal({ platform: "reverb", buyPrice: v.offerPrice!, shipping: 20, comps, compSource: "sold" });
    expect(again.qualifies).toBe(true);
    expect(maxBuyPrice(r, 240)).toBe(v.offerPrice);
  });
  it("says PASS when overpriced or uncertain", () => {
    const r = priceDeal({ platform: "reverb", buyPrice: 400, shipping: 20, comps, compSource: "sold" });
    expect(verdict(r, 400).verdict).toBe("PASS");
    const thin = priceDeal({ platform: "ebay", buyPrice: 10, shipping: 0, comps: [100], compSource: "active_proxy" });
    expect(verdict(thin, 10).verdict).toBe("PASS");
  });
});
