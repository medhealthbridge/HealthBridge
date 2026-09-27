import { z } from "zod";

// PH mobile as staff actually type it: 09XX ... or +639XX ..., spaces allowed.
const phMobile = z
  .string()
  .trim()
  .regex(/^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/, "Use a PH mobile number, e.g. 0917 555 4412.");

export const patientSchema = z.object({
  first: z.string().trim().min(1, "Enter the first name.").max(80),
  middle: z.string().trim().max(80).default(""),
  last: z.string().trim().min(1, "Enter the last name.").max(80),
  suffix: z.string().trim().max(12).default(""),
  sex: z.enum(["F", "M"]),
  age: z.coerce.number<number>().int().min(0).max(130),
  mobile: phMobile,
  // PhilHealth PIN is 12 digits, conventionally grouped 2-9-1.
  philhealth: z
    .string()
    .trim()
    .regex(/^\d{2}-\d{9}-\d$/, "Use the 12-digit PhilHealth PIN, e.g. 12-345678901-2.")
    .or(z.literal(""))
    .default(""),
  oscaId: z.string().trim().max(40).default(""),
  allergies: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(500).default(""),
});

export type PatientInput = z.infer<typeof patientSchema>;
