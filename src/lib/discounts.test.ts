import { describe, expect, it } from "vitest";
import { parseDiscountAmount, ruleFrom } from "./discounts";

describe("discounts", () => {
  it("parses percents and pesos", () => {
    expect(parseDiscountAmount("percent", "10%")).toEqual({ value: 10 });
    expect(parseDiscountAmount("fixed", "₱1,500.50")).toEqual({ value: 150_050 });
  });
  it("refuses nonsense", () => {
    expect(parseDiscountAmount("percent", "150")).toHaveProperty("error");
    expect(parseDiscountAmount("percent", "2.5")).toHaveProperty("error");
    expect(parseDiscountAmount("fixed", "-5")).toHaveProperty("error");
    expect(parseDiscountAmount("fixed", "abc")).toHaveProperty("error");
  });
  it("rebuilds a rule from what an invoice stored", () => {
    expect(ruleFrom("percent", 10, "Employee")).toEqual({ kind: "percent", percent: 10, label: "Employee" });
    expect(ruleFrom("statutory", null, "Senior citizen (20%)")).toEqual({ kind: "statutory", label: "Senior citizen (20%)" });
    expect(ruleFrom(null, null, null)).toEqual({ kind: "none" });
  });
});
