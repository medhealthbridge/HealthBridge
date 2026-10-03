import { z } from "zod";

const optionalId = z.union([z.uuid(), z.literal("")]).transform((value) => value || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time.");

export const bookAppointmentSchema = z.object({
  patientId: z.uuid("Choose a patient."),
  serviceId: optionalId,
  practitionerStaffId: optionalId,
  date,
  time,
});
export type BookAppointmentField = keyof z.input<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.uuid(),
  practitionerStaffId: optionalId,
  date,
  time,
});
export type RescheduleField = keyof z.input<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({ appointmentId: z.uuid() });

/** A calendar day in the URL, e.g. ?date=2026-10-05; anything else means today. */
export const dayParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(value)));
