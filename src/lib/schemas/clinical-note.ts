import { z } from "zod";

const field = z.string().trim().max(4000, "Keep each section under 4,000 characters.");

/** A SOAP-style visit note. Specialty-specific records (odontogram, refraction…) come later as their own note types. */
export const clinicalNoteSchema = z
  .object({
    subjective: field.default(""),
    objective: field.default(""),
    assessment: field.default(""),
    plan: field.default(""),
    appointmentId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null).default(null),
  })
  .refine((note) => [note.subjective, note.objective, note.assessment, note.plan].some((part) => part.length > 0), {
    message: "Write something in at least one section.",
    path: ["subjective"],
  });

export type ClinicalNoteInput = z.output<typeof clinicalNoteSchema>;
export type NoteField = "subjective" | "objective" | "assessment" | "plan" | "appointmentId";

export const voidNoteSchema = z.object({
  noteId: z.uuid(),
  reason: z.string().trim().min(5, "Say why (at least 5 characters).").max(300),
});
