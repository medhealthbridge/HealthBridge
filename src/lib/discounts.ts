import type { DiscountRule } from "./invoice-totals";

/** What the cashier typed for a discount's amount: a whole percent (1-100) or pesos (stored as centavos). */
export function parseDiscountAmount(kind: "percent" | "fixed", text: string): { value: number } | { error: string } {
  const number = Number(text.replace(/[,₱%\s]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return { error: "Enter the amount." };
  if (kind === "percent") {
    if (number > 100) return { error: "A percent can't be over 100." };
    if (!Number.isInteger(number)) return { error: "Use a whole percent, e.g. 10." };
    return { value: number };
  }
  if (number > 1_000_000) return { error: "That amount is too high." };
  return { value: Math.round(number * 100) };
}

/** The rule stored on an invoice (kind, value, label), turned back into maths. */
export function ruleFrom(kind: string | null, value: number | null, label: string | null): DiscountRule {
  if (kind === "statutory") return { kind: "statutory", label: label ?? "Statutory discount" };
  if (kind === "percent" && value) return { kind: "percent", percent: value, label: label ?? "Discount" };
  if (kind === "fixed" && value) return { kind: "fixed", cents: value, label: label ?? "Discount" };
  return { kind: "none" };
}

export const describeDiscount = (kind: "percent" | "fixed", value: number) => (kind === "percent" ? `${value}%` : `₱${(value / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })} off`);
