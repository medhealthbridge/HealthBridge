import { describe, expect, it } from "vitest";
import { invoiceTotals } from "./invoice-totals";

describe("invoiceTotals", () => {
  it("keeps the price and reports the VAT inside it", () => {
    const t = invoiceTotals([{ unitPriceCents: 11_200, quantity: 1, vatExempt: false }], "none");
    expect(t).toEqual({ subtotalCents: 11_200, discountCents: 0, vatCents: 1_200, vatExemptCents: 0, totalCents: 11_200 });
  });
  it("backs VAT out before the 20% for senior citizens", () => {
    const t = invoiceTotals([{ unitPriceCents: 11_200, quantity: 1, vatExempt: false }], "senior_citizen");
    expect(t.vatExemptCents).toBe(1_200);
    expect(t.discountCents).toBe(2_000);
    expect(t.totalCents).toBe(8_000);
  });
  it("takes 20% straight off a VAT-exempt service for PWD", () => {
    const t = invoiceTotals([{ unitPriceCents: 50_000, quantity: 2, vatExempt: true }], "pwd");
    expect(t).toEqual({ subtotalCents: 100_000, discountCents: 20_000, vatCents: 0, vatExemptCents: 0, totalCents: 80_000 });
  });
  it("multiplies by quantity and mixes line kinds", () => {
    const t = invoiceTotals([
      { unitPriceCents: 10_000, quantity: 3, vatExempt: true },
      { unitPriceCents: 5_600, quantity: 1, vatExempt: false },
    ], "none");
    expect(t.totalCents).toBe(35_600);
    expect(t.vatCents).toBe(600);
  });
});

import { invoiceTotalsFor } from "./invoice-totals";

describe("invoiceTotalsFor (clinic discounts)", () => {
  const vatable = { unitPriceCents: 11_200, quantity: 1, vatExempt: false };
  it("takes a percent off and scales the VAT inside the price", () => {
    const t = invoiceTotalsFor([vatable], { kind: "percent", percent: 10, label: "Employee" });
    expect(t).toEqual({ subtotalCents: 11_200, discountCents: 1_120, vatCents: 1_080, vatExemptCents: 0, totalCents: 10_080 });
  });
  it("takes a fixed amount off, capped at the bill", () => {
    expect(invoiceTotalsFor([vatable], { kind: "fixed", cents: 500, label: "Promo" }).totalCents).toBe(10_700);
    expect(invoiceTotalsFor([vatable], { kind: "fixed", cents: 99_999, label: "Promo" }).totalCents).toBe(0);
  });
  it("never loses a centavo spreading a fixed discount over lines", () => {
    const lines = [{ unitPriceCents: 3_333, quantity: 1, vatExempt: true }, { unitPriceCents: 3_333, quantity: 1, vatExempt: true }, { unitPriceCents: 3_334, quantity: 1, vatExempt: true }];
    const t = invoiceTotalsFor(lines, { kind: "fixed", cents: 1_000, label: "x" });
    expect(t.discountCents).toBe(1_000);
    expect(t.totalCents).toBe(9_000);
  });
  it("keeps the statutory rule exactly as before", () => {
    expect(invoiceTotalsFor([vatable], { kind: "statutory", label: "Senior" })).toMatchObject({ vatExemptCents: 1_200, discountCents: 2_000, totalCents: 8_000 });
  });
});
