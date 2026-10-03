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

/**
 * Invoice maths in whole centavos, for a VAT-inclusive price list.
 *
 * Per line: a VATable line's listed price contains 12% VAT. A senior/PWD sale
 * is VAT-exempt first (the VAT is backed out) and the 20% discount is then
 * taken on that VAT-exclusive base (RA 9994, RA 10754). A line the clinic
 * marks VAT-exempt (most professional services) has no VAT to back out, so
 * the 20% comes straight off the price.
 */
export function invoiceTotals(lines: InvoiceLineInput[], discountType: DiscountType): InvoiceTotals {
  const discounted = discountType !== "none";
  const totals: InvoiceTotals = { subtotalCents: 0, discountCents: 0, vatCents: 0, vatExemptCents: 0, totalCents: 0 };
  for (const line of lines) {
    const gross = line.unitPriceCents * line.quantity;
    const base = line.vatExempt ? gross : Math.round(gross / (1 + VAT_RATE / 100));
    const vatPortion = gross - base;
    totals.subtotalCents += gross;
    if (!discounted) {
      totals.vatCents += vatPortion;
      totals.totalCents += gross;
      continue;
    }
    const discount = Math.round((base * STATUTORY_DISCOUNT_RATE) / 100);
    totals.vatExemptCents += vatPortion;
    totals.discountCents += discount;
    totals.totalCents += base - discount;
  }
  return totals;
}
