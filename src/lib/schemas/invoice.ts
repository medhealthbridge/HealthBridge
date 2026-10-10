import { z } from "zod";
import { parseDiscountAmount } from "@/src/lib/discounts";

export const PAYMENT_METHODS = ["cash", "gcash", "maya", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", gcash: "GCash", maya: "Maya", card: "Card" };
/** Kept for receipts printed before discounts could have custom descriptions. */
export const DISCOUNT_LABELS = { none: "No discount", senior_citizen: "Senior citizen (20%)", pwd: "PWD (20%)" } as const;

export const MAX_INSTALLMENTS = 24;

/** Pesos as typed ("1,500" or "1500.50") → whole centavos. */
const pesos = (label: string) =>
  z
    .union([z.number(), z.string().trim().transform((value) => Number(value.replace(/[,₱\s]/g, "")))])
    .pipe(z.number(`Enter ${label}.`).min(0, `${label} can't be negative.`).max(10_000_000, `${label} is too high.`))
    .transform((value) => Math.round(value * 100));

const optionalPesos = (label: string) =>
  z.union([z.literal(""), z.null(), z.undefined(), pesos(label)]).transform((value) => (value === "" || value === null || value === undefined ? null : (value as number)));

const discountSchema = z
  .object({
    type: z.enum(["none", "senior_citizen", "pwd", "saved", "custom"]).default("none"),
    savedId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
    idNumber: z.string().trim().max(40).default(""),
    label: z.string().trim().max(60).default(""),
    customKind: z.enum(["percent", "fixed"]).default("percent"),
    customValue: z.string().trim().default(""),
  })
  .superRefine((value, ctx) => {
    if ((value.type === "senior_citizen" || value.type === "pwd") && value.idNumber.length < 4) {
      ctx.addIssue({ code: "custom", path: ["idNumber"], message: "Record the senior or PWD ID number." });
    }
    if (value.type === "saved" && !value.savedId) ctx.addIssue({ code: "custom", path: ["savedId"], message: "Choose the discount." });
    if (value.type === "custom") {
      if (value.label.length < 3) ctx.addIssue({ code: "custom", path: ["label"], message: "Describe the discount, e.g. Employee discount." });
      const parsed = parseDiscountAmount(value.customKind, value.customValue);
      if ("error" in parsed) ctx.addIssue({ code: "custom", path: ["customValue"], message: parsed.error });
    }
  });

/** Lines arrive as JSON; only ids and quantities are trusted, prices are re-read on the server. */
export const checkoutSchema = z
  .object({
    patientId: z.uuid("Choose the patient."),
    appointmentId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
    lines: z.array(z.object({ serviceId: z.uuid(), quantity: z.coerce.number().int().min(1).max(99) })).max(30).default([]),
    planItemIds: z.array(z.uuid()).max(60).default([]),
    discount: discountSchema.default({ type: "none", savedId: null, idNumber: "", label: "", customKind: "percent", customValue: "" }),
    /** Empty = pay it all now. Less than the total = the rest stays as a balance (pay later). */
    payNow: optionalPesos("the amount paid now").default(null),
    method: z.enum(PAYMENT_METHODS).optional(),
    referenceNumber: z.string().trim().max(60).default(""),
    installmentCount: z.coerce.number().int().min(0).max(MAX_INSTALLMENTS).default(0),
    firstDueOn: z.union([z.iso.date(), z.literal("")]).transform((value) => value || null).default(null),
    /** Optional, never forced: remind the patient to come back in this many months. */
    recallMonths: z.coerce.number().int().min(0).max(24).default(0),
    recallReason: z.string().trim().max(80).default(""),
    /** Made when the dialog opens; a replay of the same submit returns the first receipt instead of a second one. */
    requestId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
  })
  .superRefine((value, ctx) => {
    if (value.lines.length === 0 && value.planItemIds.length === 0) ctx.addIssue({ code: "custom", path: ["lines"], message: "Add at least one service or plan item." });
    // "Pay all now" (payNow empty) on a free bill sends no method: only the server knows the total, so it checks that case.
    // Whenever a method is sent, or an amount is typed, the usual rules apply here.
    const paying = value.payNow === null ? !!value.method : value.payNow > 0;
    if (value.payNow !== null && value.payNow > 0 && !value.method) ctx.addIssue({ code: "custom", path: ["method"], message: "Choose how they paid." });
    if (paying && value.method && value.method !== "cash" && value.referenceNumber.length < 4) {
      ctx.addIssue({ code: "custom", path: ["referenceNumber"], message: "Enter the payment reference number." });
    }
    if (value.installmentCount > 0 && !value.firstDueOn) ctx.addIssue({ code: "custom", path: ["firstDueOn"], message: "Choose when the first installment is due." });
  });

export type CheckoutInput = z.output<typeof checkoutSchema>;
export type CheckoutField = "patientId" | "lines" | "discount" | "idNumber" | "method" | "referenceNumber" | "payNow" | "firstDueOn" | "label" | "customValue" | "savedId";

export const voidInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  reason: z.string().trim().min(5, "Say why (at least 5 characters).").max(300),
});

export const recordPaymentSchema = z
  .object({
    invoiceId: z.uuid(),
    amount: pesos("the amount").refine((cents) => cents > 0, "Enter the amount."),
    method: z.enum(PAYMENT_METHODS, "Choose how they paid."),
    referenceNumber: z.string().trim().max(60).default(""),
    requestId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
  })
  .superRefine((value, ctx) => {
    if (value.method !== "cash" && value.referenceNumber.length < 4) ctx.addIssue({ code: "custom", path: ["referenceNumber"], message: "Enter the payment reference number." });
  });

export const discountTypeSchema = z.object({
  name: z.string().trim().min(2, "Name the discount.").max(60),
  description: z.string().trim().max(200).or(z.literal("")).nullish().transform((value) => value || null),
  kind: z.enum(["percent", "fixed"], "Choose percent or fixed amount."),
  value: z.string().trim().min(1, "Enter the amount."),
  requiresId: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((value) => value === "on" || value === true),
}).transform((input, ctx) => {
  const parsed = parseDiscountAmount(input.kind, input.value);
  if ("error" in parsed) {
    ctx.addIssue({ code: "custom", path: ["value"], message: parsed.error });
    return z.NEVER;
  }
  return { ...input, value: parsed.value };
});
export type DiscountTypeInput = z.output<typeof discountTypeSchema>;
