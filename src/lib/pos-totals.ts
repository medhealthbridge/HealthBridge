import { STATUTORY_DISCOUNT_RATE, VAT_RATE } from "@/src/lib/mock-data/clinix-app";

export type PosTotals = {
  gross: number;
  /** VAT stripped out because the sale is exempt (senior / PWD). */
  vatExempt: number;
  /** VAT actually due on a normal sale. */
  vat: number;
  discount: number;
  net: number;
};

/**
 * Philippine counter maths for a VAT-inclusive price list.
 *
 * RA 9994 (senior citizens) and RA 10754 (PWDs) give the same relief and it is
 * not a plain 20% off the sticker: the sale becomes VAT-exempt first, so the
 * 12% is backed out of the listed price, and the 20% statutory discount is
 * then taken on that VAT-exclusive base. Discounting first and exempting after
 * would overcharge the customer and under-report the exempt sale to the BIR.
 */
export function posTotals(prices: number[], senior: boolean): PosTotals {
  const gross = prices.reduce((total, price) => total + price, 0);
  const base = gross / (1 + VAT_RATE / 100);

  if (!senior) {
    return { gross, vatExempt: 0, vat: gross - base, discount: 0, net: gross };
  }

  const discount = base * (STATUTORY_DISCOUNT_RATE / 100);
  return { gross, vatExempt: gross - base, vat: 0, discount, net: base - discount };
}
