import { describe, expect, it } from "vitest";
import { parsePayment } from "./whop-payment";

const ids = { seat: "prod_6wQanxYEf6Hgx", check: "prod_Sv81ZgG5zEQ2A" };

describe("parsePayment", () => {
  it("reads the current payload shape (line_items, customer_email, total.amount)", () => {
    const p = parsePayment({
      id: "pay_1",
      customer_email: "Buyer@Example.com",
      total: { amount: "7.00", currency: "usd" },
      line_items: [{ product_id: "prod_Sv81ZgG5zEQ2A", product_title: "Flipper Check" }],
    }, ids);
    expect(p).toEqual({ paymentId: "pay_1", title: "Flipper Check", productId: "prod_Sv81ZgG5zEQ2A", kind: "check", email: "buyer@example.com", amount: 7 });
  });

  it("reads the older shape (product, user.email, numeric totals)", () => {
    const p = parsePayment({
      id: "pay_2",
      user: { email: "a@b.co" },
      usd_total: 49,
      product: { id: "prod_6wQanxYEf6Hgx", title: "Flipper Founding Seat" },
    }, ids);
    expect(p.kind).toBe("seat");
    expect(p.amount).toBe(49);
    expect(p.email).toBe("a@b.co");
  });

  it("falls back to the title when product ids are unknown", () => {
    expect(parsePayment({ id: "pay_3", line_items: [{ product_title: "Flipper Check" }], total: { amount: "7.00" } }).kind).toBe("check");
    expect(parsePayment({ id: "pay_4", product: { title: "Something else" } }).kind).toBe("other");
  });
});
