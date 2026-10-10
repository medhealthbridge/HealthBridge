/**
 * QA wave check 2026-10-10: reproductions of bugs BUG-003 and BUG-013, now fixed. Kept as regression tests.
 * See qa/QA_REPORT_wave-check_2026-10-10.md.
 */
import { describe, expect, it } from "vitest";
import { buildInstallments } from "./installments";
import { checkoutSchema } from "./schemas/invoice";

describe("BUG-003: a ₱0.00 bill cannot be checked out from the dialog", () => {
  it("accepts the form the dialog sends for a ₱0 total (payNow empty, no method: the dialog hides 'Paid by' when nothing is due)", () => {
    // Dialog: paidNowCents = 0 → the method <select> is not rendered, so no `method` is posted; payNow hidden input is "".
    const posted = { patientId: "22222222-2222-4222-8222-222222222222", lines: [{ serviceId: "33333333-3333-4333-8333-333333333333", quantity: 1 }], payNow: "" };
    expect(checkoutSchema.safeParse(posted).success).toBe(true);
  });
});

describe("BUG-013: installment schedule can contain ₱0.00 installments", () => {
  it("every scheduled installment asks for at least ₱0.01", () => {
    // ₱0.05 balance spread over 12 months → eleven ₱0.00 installments and one ₱0.05.
    const parts = buildInstallments(5, 12, "2026-11-01");
    expect(parts.every((part) => part.amountCents > 0)).toBe(true);
  });
});
