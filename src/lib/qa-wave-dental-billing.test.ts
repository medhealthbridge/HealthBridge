/**
 * QA wave check 2026-10-10 (tooth chart, plans, checkout, installments, discounts).
 * Expected values are hand-worked from RA 9994 / RA 10754 (VAT backed out, then 20%) and plain arithmetic,
 * not recomputed the way the code does. See qa/QA_REPORT_wave-check_2026-10-10.md.
 */
import { describe, expect, it } from "vitest";
import { chartEntrySchema, deriveToothStates, isTooth, normalizeSurfaces, universalLabel } from "./dental-chart";
import { planItemSchema, planStatusSchema, recallInputSchema, chartVoidSchema } from "./schemas/dental";
import { checkoutSchema, recordPaymentSchema, discountTypeSchema } from "./schemas/invoice";
import { invoiceTotalsFor } from "./invoice-totals";
import { addMonths, buildInstallments, installmentStatuses, nextInstallmentDue } from "./installments";
import { parseDiscountAmount } from "./discounts";
import { canSetPlanStatus, nextPlanStatus, type PlanItemLike } from "./plan-totals";

const PLAN = "11111111-1111-4111-8111-111111111111";
const PATIENT = "22222222-2222-4222-8222-222222222222";
const SERVICE = "33333333-3333-4333-8333-333333333333";

describe("QA tooth numbers (boundary values, FDI 11-48 and 51-85)", () => {
  it.each([10, 19, 20, 29, 49, 50, 56, 66, 76, 86, 90, 0, -11, 11.5, 100])("rejects %s", (tooth) => {
    expect(isTooth(tooth)).toBe(false);
    expect(chartEntrySchema.safeParse({ tooth, code: "caries" }).success).toBe(false);
  });
  it.each([11, 18, 21, 28, 31, 38, 41, 48, 51, 55, 61, 65, 71, 75, 81, 85])("accepts %s", (tooth) => {
    expect(chartEntrySchema.safeParse({ tooth: String(tooth), code: "caries" }).success).toBe(true);
  });
  it("rejects letters, blank and an unknown code", () => {
    expect(chartEntrySchema.safeParse({ tooth: "abc", code: "caries" }).success).toBe(false);
    expect(chartEntrySchema.safeParse({ tooth: "", code: "caries" }).success).toBe(false);
    expect(chartEntrySchema.safeParse({ tooth: 11, code: "drop table" }).success).toBe(false);
  });
  it("has 52 distinct teeth and baby teeth labelled A-T (Universal)", () => {
    const labels = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 75, 74, 73, 72, 71, 81, 82, 83, 84, 85].map(universalLabel);
    expect(labels.join("")).toBe("ABCDEFGHIJKLMNOPQRST");
  });
});

describe("QA surfaces", () => {
  it("keeps only M D B L O, once, in order", () => {
    expect(normalizeSurfaces("oolxbm")).toBe("MBLO");
    expect(normalizeSurfaces("<script>")).toBe("");
    expect(chartEntrySchema.parse({ tooth: 36, code: "filling", surfaces: "dmo" }).surfaces).toBe("MDO");
  });
  it("refuses more than 10 characters of surfaces", () => {
    expect(chartEntrySchema.safeParse({ tooth: 36, code: "filling", surfaces: "MDBLOMDBLOM" }).success).toBe(false);
  });
  it("a filling clears caries only on the surfaces it covers; voided entries are ignored", () => {
    const s = deriveToothStates([
      { id: "1", tooth: 36, surfaces: "MOD", kind: "condition", code: "caries", occurredOn: "2026-01-01" },
      { id: "2", tooth: 36, surfaces: "O", kind: "procedure", code: "filling", occurredOn: "2026-02-01" },
      { id: "3", tooth: 36, surfaces: null, kind: "procedure", code: "extraction", occurredOn: "2026-03-01", voided: true },
    ]).get(36)!;
    expect(s.caries).toBe("MD");
    expect(s.filling).toBe("O");
    expect(s.missing).toBe(false);
  });
});

describe("QA plan item validation", () => {
  const base = { planId: PLAN, serviceId: SERVICE, description: "", price: "", phase: "1", tooth: "", surfaces: "", chartCode: "", quantity: "1" };
  it.each([["0", false], ["1", true], ["32", true], ["33", false], ["-1", false], ["1.5", false]])("quantity %s → %s", (quantity, ok) => {
    expect(planItemSchema.safeParse({ ...base, quantity }).success).toBe(ok);
  });
  it.each([["0", false], ["1", true], ["8", true], ["9", false]])("phase %s → %s", (phase, ok) => {
    expect(planItemSchema.safeParse({ ...base, phase }).success).toBe(ok);
  });
  it.each([["10", false], ["19", false], ["50", false], ["56", false], ["86", false], ["55", true], ["", true]])("tooth %s → %s", (tooth, ok) => {
    expect(planItemSchema.safeParse({ ...base, tooth }).success).toBe(ok);
  });
  it("custom work (no service) needs a description of 3+ characters", () => {
    expect(planItemSchema.safeParse({ ...base, serviceId: "", description: "ab" }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...base, serviceId: "", description: "Gum graft" }).success).toBe(true);
  });
  it("refuses an unknown chart code and a non-uuid plan id", () => {
    expect(planItemSchema.safeParse({ ...base, chartCode: "laser" }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...base, planId: "1 OR 1=1" }).success).toBe(false);
  });
  it("plan status accepts only the four manual statuses", () => {
    expect(planStatusSchema.safeParse({ planId: PLAN, status: "completed" }).success).toBe(false);
    expect(planStatusSchema.safeParse({ planId: PLAN, status: "in_progress" }).success).toBe(false);
  });
  it("void reason needs 5+ characters; recall months 1-24", () => {
    expect(chartVoidSchema.safeParse({ entryId: PLAN, reason: "oops" }).success).toBe(false);
    expect(chartVoidSchema.safeParse({ entryId: PLAN, reason: "wrong tooth" }).success).toBe(true);
    expect(recallInputSchema.safeParse({ patientId: PATIENT, months: 0 }).success).toBe(false);
    expect(recallInputSchema.safeParse({ patientId: PATIENT, months: 25 }).success).toBe(false);
    expect(recallInputSchema.safeParse({ patientId: PATIENT, months: 24 }).success).toBe(true);
  });
});

describe("QA plan state machine", () => {
  const item = (over: Partial<PlanItemLike>): PlanItemLike => ({ phase: 1, status: "planned", unitPriceCents: 1000, quantity: 1, invoiceId: null, ...over });
  it("valid manual moves", () => {
    expect(canSetPlanStatus("draft", "proposed")).toBeNull();
    expect(canSetPlanStatus("proposed", "accepted")).toBeNull();
    expect(canSetPlanStatus("accepted", "draft")).toBeNull();
    expect(canSetPlanStatus("cancelled", "draft")).toBeNull();
  });
  it("forbidden manual moves", () => {
    expect(canSetPlanStatus("cancelled", "accepted")).not.toBeNull();
    expect(canSetPlanStatus("in_progress", "draft")).not.toBeNull();
    expect(canSetPlanStatus("completed", "accepted")).not.toBeNull();
  });
  it("item changes drive the plan: first done → in progress, all done → completed, undo → accepted", () => {
    expect(nextPlanStatus("accepted", [item({ status: "done" }), item({})])).toBe("in_progress");
    expect(nextPlanStatus("in_progress", [item({ status: "done" }), item({ status: "cancelled" })])).toBe("completed");
    expect(nextPlanStatus("completed", [item({}), item({})])).toBe("accepted");
    expect(nextPlanStatus("cancelled", [item({ status: "done" })])).toBe("cancelled");
  });
});

describe("QA money: hand-worked examples (integer centavos)", () => {
  const vatable = (pesos: number, quantity = 1) => ({ unitPriceCents: Math.round(pesos * 100), quantity, vatExempt: false });
  const exempt = (pesos: number, quantity = 1) => ({ unitPriceCents: Math.round(pesos * 100), quantity, vatExempt: true });

  it("senior, mixed bill: ₱1,120 VATable + ₱500 VAT-exempt → ₱800 + ₱400 = ₱1,200", () => {
    // VATable: 1,120 / 1.12 = 1,000 base, VAT 120 removed, 20% of 1,000 = 200 → 800. Exempt: 20% of 500 = 100 → 400.
    expect(invoiceTotalsFor([vatable(1120), exempt(500)], { kind: "statutory", label: "Senior" })).toEqual({ subtotalCents: 162_000, discountCents: 30_000, vatCents: 0, vatExemptCents: 12_000, totalCents: 120_000 });
  });
  it("PWD on an odd price ₱999.99 VATable → ₱714.28", () => {
    // 999.99 / 1.12 = 892.848… → 892.85; VAT 107.14; 20% of 892.85 = 178.57; 892.85 − 178.57 = 714.28.
    expect(invoiceTotalsFor([vatable(999.99)], { kind: "statutory", label: "PWD" })).toMatchObject({ vatExemptCents: 10_714, discountCents: 17_857, totalCents: 71_428 });
  });
  it("custom 15% on ₱2,240 VATable → ₱1,904, VAT inside ₱204", () => {
    expect(invoiceTotalsFor([vatable(2240)], { kind: "percent", percent: 15, label: "Employee" })).toEqual({ subtotalCents: 224_000, discountCents: 33_600, vatCents: 20_400, vatExemptCents: 0, totalCents: 190_400 });
  });
  it("fixed ₱500 off a ₱300 bill is capped at ₱300 (total ₱0, never negative)", () => {
    expect(invoiceTotalsFor([exempt(300)], { kind: "fixed", cents: 50_000, label: "Promo" })).toMatchObject({ discountCents: 30_000, totalCents: 0 });
  });
  it("100% custom discount → ₱0 total", () => {
    expect(invoiceTotalsFor([vatable(1120), exempt(500)], { kind: "percent", percent: 100, label: "Free" }).totalCents).toBe(0);
  });
  it("quantity multiplies: 3 × ₱1,500 exempt, senior → ₱3,600", () => {
    expect(invoiceTotalsFor([exempt(1500, 3)], { kind: "statutory", label: "Senior" }).totalCents).toBe(360_000);
  });
  it("discount amounts: percent must be whole 1-100, pesos > 0 and ≤ ₱1,000,000", () => {
    expect(parseDiscountAmount("percent", "0")).toHaveProperty("error");
    expect(parseDiscountAmount("percent", "101")).toHaveProperty("error");
    expect(parseDiscountAmount("percent", "12.5")).toHaveProperty("error");
    expect(parseDiscountAmount("percent", "100")).toEqual({ value: 100 });
    expect(parseDiscountAmount("fixed", "-50")).toHaveProperty("error");
    expect(parseDiscountAmount("fixed", "1,500.50")).toEqual({ value: 150_050 });
    expect(parseDiscountAmount("fixed", "1000001")).toHaveProperty("error");
    expect(discountTypeSchema.safeParse({ name: "Staff", kind: "percent", value: "250" }).success).toBe(false);
  });
});

describe("QA checkout and payment input", () => {
  const base = { patientId: PATIENT, lines: [{ serviceId: SERVICE, quantity: 1 }], method: "cash" };
  it.each([["", null], ["1,500.50", 150_050], ["0", 0], ["₱ 200", 20_000]])("payNow %j → %j centavos", (payNow, cents) => {
    expect(checkoutSchema.parse({ ...base, payNow }).payNow).toBe(cents);
  });
  it.each(["-1", "abc", "10000001", "Infinity"])("refuses payNow %j", (payNow) => {
    expect(checkoutSchema.safeParse({ ...base, payNow }).success).toBe(false);
  });
  it("quantity 0 / 100 refused; 30 lines max; empty bill refused", () => {
    expect(checkoutSchema.safeParse({ ...base, lines: [{ serviceId: SERVICE, quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, lines: [{ serviceId: SERVICE, quantity: 100 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, lines: Array.from({ length: 31 }, () => ({ serviceId: SERVICE, quantity: 1 })) }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
  });
  it("client cannot send a price: unknown keys on a line are dropped", () => {
    const parsed = checkoutSchema.parse({ ...base, lines: [{ serviceId: SERVICE, quantity: 1, unitPriceCents: 1 }] });
    expect(parsed.lines[0]).toEqual({ serviceId: SERVICE, quantity: 1 });
  });
  it("senior/PWD needs an ID of 4+ characters; GCash needs a reference", () => {
    expect(checkoutSchema.safeParse({ ...base, discount: { type: "senior_citizen", idNumber: "123" } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, discount: { type: "senior_citizen", idNumber: "SC-1234" } }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, method: "gcash" }).success).toBe(false);
  });
  it("pay later (₱0 now) needs no method; installments need a first due date; max 24", () => {
    expect(checkoutSchema.safeParse({ ...base, method: undefined, payNow: "0" }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...base, payNow: "0", installmentCount: 3 }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, payNow: "0", installmentCount: 25, firstDueOn: "2026-11-01" }).success).toBe(false);
  });
  it("record payment: amount must be > ₱0", () => {
    const pay = { invoiceId: PLAN, method: "cash" };
    expect(recordPaymentSchema.safeParse({ ...pay, amount: "0" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...pay, amount: "" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...pay, amount: "0.004" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...pay, amount: "-5" }).success).toBe(false);
    expect(recordPaymentSchema.parse({ ...pay, amount: "2,500" }).amount).toBe(250_000);
  });
});

describe("QA installments", () => {
  it("₱10,000.00 in 3 → 3,333.33 / 3,333.33 / 3,333.34, sum exact", () => {
    const parts = buildInstallments(1_000_000, 3, "2026-11-15");
    expect(parts.map((p) => p.amountCents)).toEqual([333_333, 333_333, 333_334]);
    expect(parts.map((p) => p.dueOn)).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });
  it("month ends clamp per month from the first date (31 Jan → 28 Feb → 31 Mar; leap 2028 → 29 Feb)", () => {
    expect(buildInstallments(300, 3, "2027-01-31").map((p) => p.dueOn)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-12-31", 1)).toBe("2027-01-31");
  });
  it("down payment does not count toward installments; later money pays oldest first", () => {
    // Total ₱10,000; ₱4,000 down; 3 × ₱2,000. A later ₱2,500 pays #1 and ₱500 of #2.
    const plan = buildInstallments(600_000, 3, "2026-11-01");
    const before = installmentStatuses(plan, 1_000_000, 400_000, "2026-10-10");
    expect(before.map((s) => s.state)).toEqual(["upcoming", "upcoming", "upcoming"]);
    const after = installmentStatuses(plan, 1_000_000, 650_000, "2026-10-10");
    expect(after.map((s) => [s.state, s.paidCents])).toEqual([["paid", 200_000], ["partial", 50_000], ["upcoming", 0]]);
    expect(nextInstallmentDue(after)).toEqual({ dueOn: "2026-12-01", amountCents: 150_000, overdue: false });
  });
  it("a past-due installment with part paid is overdue", () => {
    const plan = buildInstallments(600_000, 3, "2026-09-01");
    expect(installmentStatuses(plan, 600_000, 50_000, "2026-10-10").map((s) => s.state)).toEqual(["overdue", "overdue", "upcoming"]);
  });
});
