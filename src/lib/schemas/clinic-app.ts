import { z } from "zod";

const optional = (schema: z.ZodString) => schema.or(z.literal("")).transform((value) => value || null);

// PH mobile as staff actually type it: 09XX ... or +639XX ..., spaces allowed.
const phMobile = z
  .string()
  .trim()
  .regex(/^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/, "Use a PH mobile number, e.g. 0917 555 4412.");

export const newPatientSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name.").max(80),
  lastName: z.string().trim().min(1, "Enter the last name.").max(80),
  sex: z.enum(["F", "M"], "Choose a sex."),
  dateOfBirth: optional(
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
      .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value) <= new Date(), "Birth date can't be in the future."),
  ),
  phone: optional(phMobile),
  // PhilHealth PIN is 12 digits, conventionally grouped 2-9-1.
  philhealth: optional(z.string().trim().regex(/^\d{2}-\d{9}-\d$/, "Use the 12-digit PhilHealth PIN, e.g. 12-345678901-2.")),
  oscaId: optional(z.string().trim().max(40)),
  pwdId: optional(z.string().trim().max(40)),
  consent: z.literal("on", "Confirm the patient agreed to the data privacy notice."),
});

export type NewPatientField = keyof z.input<typeof newPatientSchema>;

export const walkInSchema = z.object({
  patientId: z.uuid("Choose a patient."),
  practitionerStaffId: z.uuid().or(z.literal("")).transform((value) => value || null),
  chairOrRoom: z.string().trim().max(40).or(z.literal("")).transform((value) => value || null),
});

export type WalkInField = keyof z.input<typeof walkInSchema>;

export const statusChangeSchema = z.object({
  appointmentId: z.uuid(),
  to: z.enum(["confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
});
