import { describe, expect, it } from "vitest";
import { score } from "./researcher";

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
