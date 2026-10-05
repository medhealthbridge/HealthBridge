import { STATUTORY_DISCOUNT_RATE, VAT_RATE } from "@/src/lib/pos-totals";

export type DiscountType = "none" | "senior_citizen" | "pwd";

export type InvoiceLineInput = { unitPriceCents: number; quantity: number; vatExempt: boolean };

export type InvoiceTotals = {
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  vatExemptCents: number;
  totalCents: number;
};

export type DiscountRule =
  | { kind: "none" }
  /** Senior citizen / PWD: the sale is VAT-exempt first, then 20% off the VAT-exclusive price (RA 9994, RA 10754). */
  | { kind: "statutory"; label: string }
  /** The clinic's own discount: a percent of the price, or a fixed amount off. VAT inside the price is scaled down with it. */
  | { kind: "percent"; percent: number; label: string }
  | { kind: "fixed"; cents: number; label: string };

/** The built-in senior and PWD rules, as stored on the invoice. */
export const STATUTORY_LABELS = { senior_citizen: "Senior citizen (20%)", pwd: "PWD (20%)" } as const;

/** Spreads `total` over `weights` so the parts add up to exactly `total` (no lost centavo). */
function spread(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / sum));
  let remainder = total - parts.reduce((a, b) => a + b, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % parts.length, remainder--) if (weights[index] > 0) parts[index] += 1;
  return parts;
}

/**
 * Invoice maths in whole centavos, for a VAT-inclusive price list.
 *
 * Statutory (senior/PWD), per line: a VATable line's listed price contains 12% VAT. The sale is
 * VAT-exempt first (the VAT is backed out) and the 20% is taken on that VAT-exclusive base. A line
 * the clinic marks VAT-exempt (most professional services) has no VAT to back out, so the 20% comes
 * straight off the price.
 *
 * Clinic discounts (percent or fixed) are not tax relief: the price drops and the VAT that was
 * inside it drops in proportion, so VAT is still reported on what was actually charged.
 */
export function invoiceTotalsFor(lines: InvoiceLineInput[], rule: DiscountRule): InvoiceTotals {
  const grosses = lines.map((line) => line.unitPriceCents * line.quantity);
  const subtotalCents = grosses.reduce((a, b) => a + b, 0);
  const vatInside = lines.map((line, index) => (line.vatExempt ? 0 : grosses[index] - Math.round(grosses[index] / (1 + VAT_RATE / 100))));
  const totals: InvoiceTotals = { subtotalCents, discountCents: 0, vatCents: 0, vatExemptCents: 0, totalCents: 0 };

  if (rule.kind === "none") {
    totals.vatCents = vatInside.reduce((a, b) => a + b, 0);
    totals.totalCents = subtotalCents;
    return totals;
  }
  if (rule.kind === "statutory") {
    lines.forEach((line, index) => {
      const base = grosses[index] - vatInside[index];
      const discount = Math.round((base * STATUTORY_DISCOUNT_RATE) / 100);
      totals.vatExemptCents += vatInside[index];
      totals.discountCents += discount;
      totals.totalCents += base - discount;
    });
    return totals;
  }
  const wanted = rule.kind === "percent" ? Math.round((subtotalCents * Math.min(100, Math.max(0, rule.percent))) / 100) : Math.max(0, rule.cents);
  const discountTotal = Math.min(wanted, subtotalCents);
  const perLine = spread(discountTotal, grosses);
  lines.forEach((_, index) => {
    const after = grosses[index] - perLine[index];
    totals.vatCents += grosses[index] === 0 ? 0 : Math.round((vatInside[index] * after) / grosses[index]);
  });
  totals.discountCents = discountTotal;
  totals.totalCents = subtotalCents - discountTotal;
  return totals;
}

/** The older entry point: the two built-in discounts by name. */
export function invoiceTotals(lines: InvoiceLineInput[], discountType: DiscountType): InvoiceTotals {
  return invoiceTotalsFor(lines, discountType === "none" ? { kind: "none" } : { kind: "statutory", label: STATUTORY_LABELS[discountType] });
}
