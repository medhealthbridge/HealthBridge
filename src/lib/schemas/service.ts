import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).or(z.literal("")).nullish().transform((value) => value || null);

/** Pesos as typed ("1,500" or "1500.50") → whole centavos. */
const pesos = z
  .union([z.number(), z.string().trim().transform((value) => Number(value.replace(/[,₱\s]/g, "")))])
  .pipe(z.number("Enter a price.").min(0, "Price can't be negative.").max(1_000_000, "That price is too high."))
  .transform((value) => Math.round(value * 100));

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the service name.").max(120),
  code: optionalText(20),
  category: optionalText(40),
  durationMinutes: z
    .union([z.literal(""), z.null(), z.coerce.number().int().min(5, "At least 5 minutes.").max(600, "At most 10 hours.")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  priceCentavos: pesos,
  vatExempt: z
    .union([z.boolean(), z.literal("on"), z.literal("")])
    .optional()
    .transform((value) => value === true || value === "on"),
});

export type ServiceInput = z.output<typeof serviceInputSchema>;
export type ServiceField = keyof z.input<typeof serviceInputSchema>;
