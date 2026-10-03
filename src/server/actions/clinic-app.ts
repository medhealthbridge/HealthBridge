"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinic, requireClinicRole } from "@/src/server/auth";
import {
  addWalkIn,
  changeAppointmentStatus,
  createPatient,
  NotFoundError,
  setPatientArchived,
  StaleChangeError,
  TransitionError,
  updatePatient,
} from "@/src/server/services/clinic-app";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import {
  editPatientSchema,
  newPatientSchema,
  statusChangeSchema,
  walkInSchema,
  type EditPatientField,
  type NewPatientField,
  type WalkInField,
} from "@/src/lib/schemas/clinic-app";
import type { FormState } from "@/src/types/form-state";

export type NewPatientState = FormState<NewPatientField> & { savedName?: string };
export type EditPatientState = FormState<EditPatientField> & { savedName?: string };
export type WalkInState = FormState<WalkInField> & { queueNumber?: number };

const WRITE_LIMIT = { max: 120, windowSeconds: 60 * 60 };

const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refreshApp() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
}

// The clinic always comes from the session and host, never from the form: a
// tampered request can't write to another clinic. Patients are written by the
// owner and the front desk; practitioners read.
export async function addPatientAction(_previous: NewPatientState, data: FormData): Promise<NewPatientState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const limit = await consumeRateLimit("clinic-write", user.id, WRITE_LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };

  const values = Object.fromEntries(
    ["firstName", "lastName", "sex", "dateOfBirth", "phone", "philhealth", "oscaId", "pwdId"].map((key) => [key, text(data, key)]),
  );
  const parsed = newPatientSchema.safeParse({ ...values, consent: text(data, "consent") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { consent, ...record } = parsed.data;
  void consent; // required to reach here; stamped as dataPrivacyConsentAt by the service
  await createPatient(clinic.id, user.id, record);
  refreshApp();
  return { savedName: `${record.firstName} ${record.lastName}` };
}

export async function addWalkInAction(_previous: WalkInState, data: FormData): Promise<WalkInState> {
  const { user, clinic } = await requireActiveClinic();
  const limit = await consumeRateLimit("clinic-write", user.id, WRITE_LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };

  const values = Object.fromEntries(["patientId", "practitionerStaffId", "chairOrRoom"].map((key) => [key, text(data, key)]));
  const parsed = walkInSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  try {
    const row = await addWalkIn(clinic, user.id, parsed.data);
    refreshApp();
    return { queueNumber: row.queueNumber ?? undefined };
  } catch (error) {
    if (error instanceof NotFoundError) return { message: "That patient or practitioner isn't at this clinic.", values };
    throw error;
  }
}

export async function changeStatusAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinic();
  const parsed = statusChangeSchema.safeParse({ appointmentId: text(data, "appointmentId"), to: text(data, "to") });
  if (!parsed.success) return { message: "That change isn't allowed." };

  try {
    await changeAppointmentStatus(clinic.id, user.id, {
      appointmentId: parsed.data.appointmentId,
      to: parsed.data.to,
      // A practitioner only works their own chair; owners and assistants run the floor.
      onlyPractitionerStaffId: clinic.role === "practitioner" ? clinic.staffId : undefined,
    });
  } catch (error) {
    if (error instanceof TransitionError) return { message: "That appointment has already moved on. Refresh to see its current state." };
    if (error instanceof NotFoundError) return { message: "Appointment not found." };
    throw error;
  }
  refreshApp();
  return {};
}

const PATIENT_FIELDS = ["firstName", "lastName", "sex", "dateOfBirth", "phone", "philhealth", "oscaId", "pwdId"] as const;
type EditResult = { message?: string };

/** Edits every field of one patient (owner and front desk). The record is found by id inside this clinic only. */
export async function updatePatientAction(_previous: EditPatientState, data: FormData): Promise<EditPatientState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const values = Object.fromEntries(PATIENT_FIELDS.map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, WRITE_LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = editPatientSchema.safeParse(values);
  const id = z.uuid().safeParse(data.get("id"));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!id.success) return { values, message: "That patient could not be found." };

  try {
    await updatePatient(clinic.id, user.id, id.data, parsed.data);
  } catch (error) {
    if (error instanceof NotFoundError) return { values, message: "That patient no longer exists." };
    if (error instanceof StaleChangeError) return { values, message: "That record changed. Reload and try again." };
    throw error;
  }
  refreshApp();
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
  return { savedName: `${parsed.data.firstName} ${parsed.data.lastName}` };
}

export async function setPatientArchivedAction(data: FormData): Promise<EditResult> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const parsed = z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), archived: data.get("archived") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setPatientArchived(clinic.id, user.id, parsed.data.id, parsed.data.archived === "true");
  } catch (error) {
    if (error instanceof NotFoundError) return { message: "That patient is already in that state." };
    throw error;
  }
  refreshApp();
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
  return {};
}
