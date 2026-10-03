"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClinicRole } from "@/src/server/auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import { createClinicalNote, NoteLockedError, NotAuthorError, updateClinicalNote, voidClinicalNote } from "@/src/server/services/clinical-notes";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { clinicalNoteSchema, voidNoteSchema, type NoteField } from "@/src/lib/schemas/clinical-note";
import type { FormState } from "@/src/types/form-state";

export type NoteState = FormState<NoteField> & { saved?: boolean };

const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
}

/**
 * Writes a visit note. Doctors write: the owner and practitioners. With `noteId`
 * it edits one's own note (inside the 24-hour window); with `amendsNoteId` it
 * adds a correction that points back at the original; otherwise it is a new note.
 */
export async function saveNoteAction(_prev: NoteState, data: FormData): Promise<NoteState> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const values = Object.fromEntries(["subjective", "objective", "assessment", "plan", "appointmentId"].map((key) => [key, text(data, key)]));
  const limit = await consumeRateLimit("clinic-write", user.id, { max: 120, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = clinicalNoteSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const patientId = z.uuid().safeParse(data.get("patientId"));
  const noteId = z.uuid().safeParse(data.get("noteId"));
  const amendsId = z.uuid().safeParse(data.get("amendsNoteId"));
  try {
    if (noteId.success) await updateClinicalNote(clinic, user.id, noteId.data, parsed.data);
    else if (patientId.success) await createClinicalNote(clinic, user.id, patientId.data, parsed.data, amendsId.success ? amendsId.data : undefined);
    else return { values, message: "That patient could not be found." };
  } catch (error) {
    if (error instanceof NoteLockedError) return { values, message: "This note is locked after 24 hours. Add an amendment instead." };
    if (error instanceof NotAuthorError) return { values, message: "Only the author can change a note." };
    if (error instanceof NotFoundError) return { values, message: "That note no longer exists." };
    throw error;
  }
  refresh();
  return { saved: true };
}

export async function voidNoteAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const parsed = voidNoteSchema.safeParse({ noteId: data.get("noteId"), reason: data.get("reason") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.reason?.[0] ?? "That change isn't allowed." };
  try {
    await voidClinicalNote(clinic, user.id, parsed.data.noteId, parsed.data.reason);
  } catch (error) {
    if (error instanceof NotAuthorError) return { message: "Only the author can void a note." };
    if (error instanceof NotFoundError) return { message: "That note is already gone." };
    throw error;
  }
  refresh();
  return {};
}
