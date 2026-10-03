import { z } from "zod";

export const patientEmailSchema = z.object({
  patientId: z.uuid(),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."))]).transform((value) => value || null),
});
