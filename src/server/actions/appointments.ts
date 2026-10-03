"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicRole } from "@/src/server/auth";
import {
  bookAppointment,
  changeAppointmentStatus,
  clinicLocalToUtc,
  ConflictError,
  listPatients,
  NotFoundError,
  rescheduleAppointment,
  TransitionError,
} from "@/src/server/services/clinic-app";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  type BookAppointmentField,
  type RescheduleField,
} from "@/src/lib/schemas/appointments";
import type { FormState } from "@/src/types/form-state";

export type BookState = FormState<BookAppointmentField> & { booked?: boolean };
export type RescheduleState = FormState<RescheduleField> & { moved?: boolean };

const LIMIT = { max: 120, windowSeconds: 60 * 60 };
const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/appointments`);
}

const CONFLICT = "That practitioner already has an appointment at that time. Pick another time or practitioner.";

/** Owner and front desk book. The clinic comes from the session; patient, service and practitioner are checked against it. */
export async function bookAppointmentAction(_prev: BookState, data: FormData): Promise<BookState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(["patientId", "serviceId", "practitionerStaffId", "date", "time"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = bookAppointmentSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await bookAppointment(clinic, user.id, {
      patientId: parsed.data.patientId,
      serviceId: parsed.data.serviceId,
      practitionerStaffId: parsed.data.practitionerStaffId,
      startsAt: clinicLocalToUtc(`${parsed.data.date}T${parsed.data.time}`, clinic.timezone),
    });
  } catch (error) {
    if (error instanceof ConflictError) return { values, message: CONFLICT };
    if (error instanceof NotFoundError) return { values, message: "That patient, service or practitioner isn't at this clinic." };
    if (error instanceof Error && error.message === "That time has passed.") return { values, fieldErrors: { time: ["That time has already passed."] } };
    throw error;
  }
  refresh();
  return { booked: true };
}

export async function rescheduleAppointmentAction(_prev: RescheduleState, data: FormData): Promise<RescheduleState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(["appointmentId", "practitionerStaffId", "date", "time"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = rescheduleAppointmentSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await rescheduleAppointment(clinic, user.id, parsed.data.appointmentId, {
      startsAt: clinicLocalToUtc(`${parsed.data.date}T${parsed.data.time}`, clinic.timezone),
      practitionerStaffId: parsed.data.practitionerStaffId,
    });
  } catch (error) {
    if (error instanceof ConflictError) return { values, message: CONFLICT };
    if (error instanceof NotFoundError) return { values, message: "That appointment no longer exists." };
    if (error instanceof TransitionError) return { values, message: "Only booked appointments that haven't started can be moved." };
    if (error instanceof Error && error.message === "That time has passed.") return { values, fieldErrors: { time: ["That time has already passed."] } };
    throw error;
  }
  refresh();
  return { moved: true };
}

export async function cancelAppointmentAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const parsed = cancelAppointmentSchema.safeParse({ appointmentId: data.get("appointmentId") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await changeAppointmentStatus(clinic.id, user.id, { appointmentId: parsed.data.appointmentId, to: "cancelled" });
  } catch (error) {
    if (error instanceof TransitionError) return { message: "That appointment has already moved on." };
    if (error instanceof NotFoundError) return { message: "That appointment no longer exists." };
    throw error;
  }
  refresh();
  return {};
}

/** For the booking form's patient picker: a few matches by name, MRN or mobile. */
export async function searchPatientsForBookingAction(query: string): Promise<{ id: string; label: string }[]> {
  const { clinic } = await requireClinicRole("owner", "assistant");
  const needle = z.string().trim().min(2).max(60).safeParse(query);
  if (!needle.success) return [];
  const { rows } = await listPatients(clinic.id, needle.data);
  return rows.slice(0, 8).map((row) => ({ id: row.id, label: `${row.name} · ${row.mrn}` }));
}
