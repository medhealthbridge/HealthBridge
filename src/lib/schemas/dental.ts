import { z } from "zod";
import { CODE_BY_KEY, isTooth } from "@/src/lib/dental-chart";

const optionalText = (max: number) => z.string().trim().max(max).or(z.literal("")).nullish().transform((value) => value || null);

export const planInputSchema = z.object({
  patientId: z.uuid(),
  title: z.string().trim().min(2, "Name the plan, e.g. Full mouth rehabilitation.").max(100),
  notes: optionalText(1000),
  phaseLabels: z.string().default("").transform((value) => value.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 8)),
});

export const planItemSchema = z
  .object({
    planId: z.uuid(),
    serviceId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
    description: z.string().trim().max(160).default(""),
    price: z.string().trim().default(""),
    phase: z.coerce.number().int().min(1).max(8).default(1),
    tooth: z.union([z.literal(""), z.coerce.number().int().refine(isTooth, "Choose a tooth.")]).transform((value) => (value === "" ? null : value)).default(null),
    surfaces: z.string().max(10).default(""),
    chartCode: z.union([z.literal(""), z.string().refine((value) => CODE_BY_KEY.has(value), "Unknown chart entry.")]).transform((value) => value || null).default(null),
    quantity: z.coerce.number().int().min(1).max(32).default(1),
  })
  .superRefine((value, ctx) => {
    if (!value.serviceId && value.description.length < 3) ctx.addIssue({ code: "custom", path: ["description"], message: "Choose a service, or describe the work." });
  });

export const planStatusSchema = z.object({ planId: z.uuid(), status: z.enum(["draft", "proposed", "accepted", "cancelled"]) });
export const itemIdSchema = z.object({ itemId: z.uuid() });

export const chartVoidSchema = z.object({ entryId: z.uuid(), reason: z.string().trim().min(5, "Say why (at least 5 characters).").max(300) });

export const recallInputSchema = z.object({
  patientId: z.uuid("Choose the patient."),
  months: z.coerce.number().int().min(1).max(24).default(6),
  reason: optionalText(80),
});
