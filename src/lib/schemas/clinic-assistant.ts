import { z } from "zod";

// Same shapes the clinic app's forms accept, so the assistant can't write what a form would refuse.
const phMobile = z.string().trim().regex(/^(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/, "Use a PH mobile number, e.g. 0917 555 4412.");
const philhealth = z.string().trim().regex(/^\d{2}-\d{9}-\d$/, "Use the 12-digit PhilHealth PIN, e.g. 12-345678901-2.");
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 1990-05-17.")
  .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value) <= new Date(), "Birth date can't be in the future.");

/** Fields the assistant may change on a patient. `null` clears an optional field. */
export const patientChangesSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    sex: z.enum(["F", "M"]),
    dateOfBirth: isoDate.nullable(),
    phone: phMobile.nullable(),
    philhealth: philhealth.nullable(),
    oscaId: z.string().trim().max(40).nullable(),
    pwdId: z.string().trim().max(40).nullable(),
  })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, "Name at least one field to change.");

export const newPatientByAssistantSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  sex: z.enum(["F", "M"]),
  dateOfBirth: isoDate.nullable().default(null),
  phone: phMobile.nullable().default(null),
  philhealth: philhealth.nullable().default(null),
});

export const mrnSchema = z.string().trim().regex(/^MRN-\d{3,8}$/, "An MRN looks like MRN-00007.");
export const localDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use YYYY-MM-DDTHH:mm in the clinic's time.");
