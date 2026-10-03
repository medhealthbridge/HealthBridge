import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).or(z.literal("")).nullish().transform((value) => value || null);
const wholeNumber = (label: string, min: number, max = 100_000) =>
  z.coerce.number(`Enter ${label}.`).int(`${label} must be a whole number.`).min(min, min > 0 ? `${label} must be at least ${min}.` : `${label} can't be negative.`).max(max, `${label} is too large.`);

export const itemInputSchema = z.object({
  name: z.string().trim().min(2, "Enter the item name.").max(120),
  sku: optionalText(40),
  unit: z.string().trim().min(1, "Enter a unit, e.g. box.").max(20).default("unit"),
  reorderThreshold: wholeNumber("the reorder level", 0).default(0),
});
export type ItemInput = z.output<typeof itemInputSchema>;
export type ItemField = keyof z.input<typeof itemInputSchema>;

export const receiveStockSchema = z.object({
  itemId: z.uuid(),
  quantity: wholeNumber("the quantity", 1),
  lotNumber: optionalText(40),
  expiresOn: z.union([z.iso.date("Use a valid date."), z.literal("")]).transform((value) => value || null).default(null),
});
export type ReceiveStockInput = z.output<typeof receiveStockSchema>;

export const useStockSchema = z.object({
  itemId: z.uuid(),
  quantity: wholeNumber("the quantity", 1),
  reason: optionalText(120),
});
export type UseStockInput = z.output<typeof useStockSchema>;

export type StockField = "quantity" | "lotNumber" | "expiresOn" | "reason";
