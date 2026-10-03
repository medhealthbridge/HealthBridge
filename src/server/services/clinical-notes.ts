import { and, desc, eq, isNull } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, clinicalNotes, clinicStaff, user } from "@/src/server/db/schema";
import type { ClinicalNoteInput } from "@/src/lib/schemas/clinical-note";
import type { StaffClinic } from "./clinic-app";
import { NotFoundError } from "./clinic-app";

/** After this long a note can only be amended (a new note that points back), never edited in place. */
export const EDIT_WINDOW_HOURS = 24;

export class NoteLockedError extends Error {}
export class NotAuthorError extends Error {}

export type ClinicalNote = {
  id: string;
  authorName: string;
  authoredByMe: boolean;
  createdAt: Date;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  appointmentId: string | null;
  amendsNoteId: string | null;
  voidReason: string | null;
  voidedAt: Date | null;
  /** Still inside the author's edit window. */
  editable: boolean;
};

type NoteData = { subjective?: string; objective?: string; assessment?: string; plan?: string; amendsNoteId?: string; voidReason?: string };

const withinWindow = (createdAt: Date, now = Date.now()) => now - createdAt.getTime() < EDIT_WINDOW_HOURS * 60 * 60 * 1000;

/** A patient's notes, newest first, voided ones included and marked so nothing silently disappears. */
export async function listClinicalNotes(clinic: Pick<StaffClinic, "id" | "staffId">, patientId: string): Promise<ClinicalNote[]> {
  return withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .select({
        id: clinicalNotes.id, authorStaffId: clinicalNotes.authorStaffId, createdAt: clinicalNotes.createdAt, deletedAt: clinicalNotes.deletedAt,
        appointmentId: clinicalNotes.appointmentId, data: clinicalNotes.data, authorName: user.name,
      })
      .from(clinicalNotes)
      .innerJoin(clinicStaff, and(eq(clinicStaff.clinicId, clinicalNotes.clinicId), eq(clinicStaff.id, clinicalNotes.authorStaffId)))
      .innerJoin(user, eq(user.id, clinicStaff.userId))
      .where(and(eq(clinicalNotes.clinicId, clinic.id), eq(clinicalNotes.patientId, patientId), eq(clinicalNotes.noteType, "general")))
      .orderBy(desc(clinicalNotes.createdAt));
    return rows.map((row) => {
      const data = row.data as NoteData;
      const mine = row.authorStaffId === clinic.staffId;
      return {
        id: row.id, authorName: row.authorName, authoredByMe: mine, createdAt: row.createdAt,
        subjective: data.subjective ?? "", objective: data.objective ?? "", assessment: data.assessment ?? "", plan: data.plan ?? "",
        appointmentId: row.appointmentId, amendsNoteId: data.amendsNoteId ?? null, voidReason: data.voidReason ?? null, voidedAt: row.deletedAt,
        editable: mine && row.deletedAt === null && withinWindow(row.createdAt),
      };
    });
  });
}

const dataOf = (input: ClinicalNoteInput, extra: Partial<NoteData> = {}): NoteData => ({
  subjective: input.subjective, objective: input.objective, assessment: input.assessment, plan: input.plan, ...extra,
});

export async function createClinicalNote(clinic: Pick<StaffClinic, "id" | "staffId">, actorUserId: string, patientId: string, input: ClinicalNoteInput, amendsNoteId?: string) {
  return withTenant(clinic.id, async (tx) => {
    const [row] = await tx
      .insert(clinicalNotes)
      .values({ clinicId: clinic.id, patientId, appointmentId: input.appointmentId, authorStaffId: clinic.staffId, noteType: "general", data: dataOf(input, amendsNoteId ? { amendsNoteId } : {}) })
      .returning({ id: clinicalNotes.id });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "clinical_note", entityId: row.id, action: "create", diff: { after: { patientId, amends: amendsNoteId ?? null } } });
    return row;
  });
}

/** Loads one of this clinic's live notes for change, enforcing authorship. */
async function ownNote(tx: Parameters<Parameters<typeof withTenant>[1]>[0], clinic: Pick<StaffClinic, "id" | "staffId">, noteId: string) {
  const [note] = await tx
    .select()
    .from(clinicalNotes)
    .where(and(eq(clinicalNotes.clinicId, clinic.id), eq(clinicalNotes.id, noteId), isNull(clinicalNotes.deletedAt)))
    .for("update")
    .limit(1);
  if (!note) throw new NotFoundError("note");
  if (note.authorStaffId !== clinic.staffId) throw new NotAuthorError();
  return note;
}

/** The author edits in place, but only within the window. Later corrections are amendments. */
export async function updateClinicalNote(clinic: Pick<StaffClinic, "id" | "staffId">, actorUserId: string, noteId: string, input: ClinicalNoteInput) {
  await withTenant(clinic.id, async (tx) => {
    const note = await ownNote(tx, clinic, noteId);
    if (!withinWindow(note.createdAt)) throw new NoteLockedError();
    const before = note.data as NoteData;
    await tx.update(clinicalNotes).set({ data: dataOf(input, before.amendsNoteId ? { amendsNoteId: before.amendsNoteId } : {}), appointmentId: input.appointmentId }).where(eq(clinicalNotes.id, noteId));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "clinical_note", entityId: noteId, action: "update", diff: { before, after: dataOf(input) } });
  });
}

/** Voiding is the delete: the note is hidden from normal reading but kept, with who voided it and why. */
export async function voidClinicalNote(clinic: Pick<StaffClinic, "id" | "staffId">, actorUserId: string, noteId: string, reason: string) {
  await withTenant(clinic.id, async (tx) => {
    const note = await ownNote(tx, clinic, noteId);
    await tx.update(clinicalNotes).set({ deletedAt: new Date(), data: { ...(note.data as NoteData), voidReason: reason } }).where(eq(clinicalNotes.id, noteId));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "clinical_note", entityId: noteId, action: "delete", diff: { after: { voided: true, reason } } });
  });
}
