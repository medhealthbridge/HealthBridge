"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinic, requireActiveClinicOwner, requireClinicRole } from "@/src/server/auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import {
  addSuggestedFields, clinicSpecialty, copyFieldsFromClinic, createFieldDefinition, FieldLimitError, FieldNotFoundError, FieldPermissionError,
  FieldValuesError, IncompatibleTypeError, listFieldDefinitions, moveField, savePatientCustomFields, setFieldArchived, updateFieldDefinition,
} from "@/src/server/services/patient-fields";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { fieldDefinitionInputSchema, MAX_ACTIVE_FIELDS } from "@/src/lib/patient-fields";
import type { FormState } from "@/src/types/form-state";

type FieldFormField = "label" | "type" | "options" | "section";
export type FieldFormState = FormState<FieldFormField> & { saved?: string };
export type PatientFieldsState = { message?: string; errors?: string[]; saved?: boolean };

const LIMIT = { max: 200, windowSeconds: 60 * 60 };
const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(`${CLINIX_ROUTES.admin}/settings`);
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
}

function problem(error: unknown): string {
  if (error instanceof FieldPermissionError) return "You can't change that field. The owner manages the clinic's standard fields.";
  if (error instanceof FieldNotFoundError) return "That field no longer exists.";
  if (error instanceof FieldLimitError) return `A clinic can have up to ${MAX_ACTIVE_FIELDS} active fields. Retire one first.`;
  if (error instanceof IncompatibleTypeError) return `${error.count} patient${error.count === 1 ? " has a value" : "s have values"} that won't fit the new type. Keep the type, or add a new field and retire this one.`;
  throw error;
}

/** Owner adds or edits any field (standard); a practitioner adds or edits only their own add-ons. */
export async function saveFieldAction(_prev: FieldFormState, data: FormData): Promise<FieldFormState> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const values = { label: text(data, "label"), type: text(data, "type"), options: text(data, "options"), section: text(data, "section") };
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = fieldDefinitionInputSchema.safeParse({
    label: values.label,
    type: values.type,
    options: values.options.split("\n").map((line) => line.trim()).filter(Boolean),
    required: data.get("required") === "on",
    medical: data.get("medical") === "on",
    section: values.section || "Other details",
  });
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors;
    return { values, fieldErrors: { label: errors.label, type: errors.type, options: errors.options, section: errors.section } };
  }
  const id = z.uuid().safeParse(data.get("id"));
  try {
    if (id.success) await updateFieldDefinition(clinic, user.id, id.data, parsed.data);
    else await createFieldDefinition(clinic, user.id, parsed.data);
  } catch (error) {
    return { values, message: problem(error) };
  }
  refresh();
  return { saved: parsed.data.label };
}

/** Retire (soft delete) or restore. Matches ArchiveButton's id/archived form. */
export async function setFieldArchivedAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const parsed = z.object({ id: z.uuid(), archived: z.enum(["true", "false"]) }).safeParse({ id: data.get("id"), archived: data.get("archived") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setFieldArchived(clinic, user.id, parsed.data.id, parsed.data.archived === "true");
  } catch (error) {
    return { message: problem(error) };
  }
  refresh();
  return {};
}

export async function moveFieldAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse({ id: data.get("id"), direction: data.get("direction") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await moveField(clinic, user.id, parsed.data.id, parsed.data.direction);
  } catch (error) {
    return { message: problem(error) };
  }
  refresh();
  return {};
}

export async function addSuggestedFieldsAction(data: FormData): Promise<{ message?: string; added?: number }> {
  const { user, clinic } = await requireActiveClinicOwner();
  const labels = data.getAll("label").map(String).filter(Boolean).slice(0, 30);
  if (labels.length === 0) return { message: "Pick at least one suggestion." };
  try {
    const added = await addSuggestedFields(clinic, user.id, await clinicSpecialty(clinic.id), labels);
    refresh();
    return { added };
  } catch (error) {
    return { message: problem(error) };
  }
}

/** Copies another branch's standard fields as a template. The source must be a branch this person also owns. */
export async function copyFieldsAction(data: FormData): Promise<{ message?: string; added?: number }> {
  const { user, clinic, clinics } = await requireActiveClinicOwner();
  const source = z.uuid().safeParse(data.get("sourceClinicId"));
  const owned = clinics.find((candidate) => candidate.id === (source.success ? source.data : "") && candidate.role === "owner" && candidate.id !== clinic.id);
  if (!owned) return { message: "Choose one of your other branches." };
  try {
    const added = await copyFieldsFromClinic(clinic, user.id, owned.id);
    refresh();
    return { added };
  } catch (error) {
    return { message: problem(error) };
  }
}

/** Any staff member fills in a patient's fields; the front desk only the non-medical ones. */
export async function savePatientFieldsAction(_prev: PatientFieldsState, data: FormData): Promise<PatientFieldsState> {
  const { user, clinic } = await requireActiveClinic();
  const patientId = z.uuid().safeParse(data.get("patientId"));
  if (!patientId.success) return { message: "That patient could not be found." };
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };
  const fields = (await listFieldDefinitions(clinic.id)).filter((field) => !field.archived);
  const raw: Record<string, unknown> = {};
  for (const field of fields) {
    const name = `cf.${field.key}`;
    raw[field.key] = field.type === "multi_select" ? data.getAll(name).map(String) : text(data, name);
  }
  try {
    await savePatientCustomFields(clinic, user.id, patientId.data, raw);
  } catch (error) {
    if (error instanceof FieldValuesError) return { errors: error.messages };
    if (error instanceof NotFoundError) return { message: "That patient could not be found." };
    throw error;
  }
  refresh();
  return { saved: true };
}
