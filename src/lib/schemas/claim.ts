import { z } from "zod";

export const PAYOR_TYPES = ["hmo", "philhealth"] as const;
export const CLAIM_STATUSES = ["filed", "pending", "approved", "denied", "resubmitted", "paid", "withdrawn"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  filed: "Filed", pending: "Pending", approved: "Approved", denied: "Denied", resubmitted: "Resubmitted", paid: "Paid", withdrawn: "Withdrawn",
};
/** Still owed to the clinic by the payor. Paid, denied (until resubmitted) and withdrawn claims are not receivable. */
export const OPEN_STATUSES: ClaimStatus[] = ["filed", "pending", "approved", "resubmitted"];

const optionalText = (max: number) => z.string().trim().max(max).or(z.literal("")).nullish().transform((value) => value || null);

const pesos = z
  .union([z.number(), z.string().trim().transform((value) => Number(value.replace(/[,₱\s]/g, "")))])
  .pipe(z.number("Enter the claim amount.").min(1, "Enter the claim amount.").max(10_000_000, "That amount is too high."))
  .transform((value) => Math.round(value * 100));

export const claimInputSchema = z.object({
  patientId: z.uuid("Choose the patient."),
  payorType: z.enum(PAYOR_TYPES, "Choose the payor type."),
  payorName: z.string().trim().min(2, "Enter the payor, e.g. Maxicare or PhilHealth.").max(80),
  memberOrPolicyNumber: optionalText(40),
  loaNumber: optionalText(40),
  claimAmountCents: pesos,
  receiptNumber: optionalText(20),
  notes: optionalText(500),
});
export type ClaimInput = z.output<typeof claimInputSchema>;
export type ClaimField = keyof z.input<typeof claimInputSchema>;

export const claimStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(CLAIM_STATUSES),
});
