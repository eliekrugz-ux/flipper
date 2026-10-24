import { describe, expect, it } from "vitest";
import { score, scoreDeals } from "./researcher";

const r = (prefer: string, a: number, b: number) => ({ prefer, A_clarity: a, A_trust: a, A_pay: a, B_clarity: b, B_trust: b, B_pay: b });

describe("study 1 scoring", () => {
  it("picks the preferred version", () => {
    const s = score([r("B", 3, 4), r("B", 2, 5), r("A", 4, 3)]);
    expect(s.winner).toBe("B");
    expect(s.B.preferred_pct).toBe(67);
    expect(s.A.would_pay).toBe(3);
  });
  it("breaks a preference tie on willingness to pay, else keeps A", () => {
    expect(score([r("A", 3, 5), r("B", 3, 5)]).winner).toBe("B");
    expect(score([r("A", 4, 4), r("B", 4, 4)]).winner).toBe("A");
  });
});

describe("study 3 deal scoring", () => {
  it("re-ranks by human appeal and reports the top-4 lift", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const roi = { a: 0.7, b: 0.6, c: 0.5, d: 0.45, e: 0.4 };
    // People like e and dislike a, despite a's ROI.
    const row = { "a:buy": 1, "a:trust": 1, "b:buy": 4, "b:trust": 4, "c:buy": 4, "c:trust": 4, "d:buy": 3, "d:trust": 3, "e:buy": 5, "e:trust": 5 };
    const s = scoreDeals([row, row], ids, roi);
    expect(s.before.top4_would_buy).toBe(3);
    expect(s.after.top4_would_buy).toBe(4);
  });
});
