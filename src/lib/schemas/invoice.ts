import { z } from "zod";

export const PAYMENT_METHODS = ["cash", "gcash", "maya", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Cash", gcash: "GCash", maya: "Maya", card: "Card" };
export const DISCOUNT_LABELS = { none: "No discount", senior_citizen: "Senior citizen (20%)", pwd: "PWD (20%)" } as const;

/** Lines arrive as one JSON field from the checkout form; only ids and quantities are trusted, prices are re-read on the server. */
export const checkoutSchema = z
  .object({
    patientId: z.uuid("Choose the patient."),
    appointmentId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
    lines: z
      .array(z.object({ serviceId: z.uuid(), quantity: z.coerce.number().int().min(1).max(99) }))
      .min(1, "Add at least one service.")
      .max(30),
    discountType: z.enum(["none", "senior_citizen", "pwd"]).default("none"),
    discountIdNumber: z.string().trim().max(40).default(""),
    method: z.enum(PAYMENT_METHODS, "Choose how they paid."),
    referenceNumber: z.string().trim().max(60).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.discountType !== "none" && value.discountIdNumber.length < 4) {
      ctx.addIssue({ code: "custom", path: ["discountIdNumber"], message: "Record the senior or PWD ID number." });
    }
    if ((value.method === "gcash" || value.method === "maya" || value.method === "card") && value.referenceNumber.length < 4) {
      ctx.addIssue({ code: "custom", path: ["referenceNumber"], message: "Enter the payment reference number." });
    }
  });

export type CheckoutInput = z.output<typeof checkoutSchema>;
export type CheckoutField = "patientId" | "lines" | "discountType" | "discountIdNumber" | "method" | "referenceNumber";

export const voidInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  reason: z.string().trim().min(5, "Say why (at least 5 characters).").max(300),
});
