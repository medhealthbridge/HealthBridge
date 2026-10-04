"use server";

import { revalidatePath } from "next/cache";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { createPatient } from "@/src/server/services/clinic-app";
import { listFieldDefinitions } from "@/src/server/services/patient-fields";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { MAX_IMPORT_BYTES, parsePatientImport } from "@/src/lib/schemas/patient-import";

export type ImportState = {
  message?: string;
  /** Preview result: how many rows are ready, and the first few problems. */
  preview?: { ready: number; problems: { line: number; errors: string[] }[]; problemCount: number; customColumns: string[]; ignoredColumns: string[] };
  imported?: number;
  skipped?: number;
};

/**
 * Owner imports patients from CSV in two steps: "preview" validates and reports,
 * "import" adds only the valid rows. Nothing is written on preview. The owner
 * confirms the patients agreed to the data privacy notice (RA 10173) before import.
 */
export async function importPatientsAction(_prev: ImportState, data: FormData): Promise<ImportState> {
  const { user, clinic } = await requireActiveClinicOwner();
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a CSV file." };
  if (file.size > MAX_IMPORT_BYTES) return { message: "That file is too large. Keep it under 1 MB." };
  const limit = await consumeRateLimit("clinic-import", user.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many imports. Try again later." };

  // The owner imports into their clinic's own fields too: every active field is a possible column.
  const fields = (await listFieldDefinitions(clinic.id)).filter((field) => !field.archived);
  const parsed = parsePatientImport(await file.text(), fields);
  if (!parsed.ok) return { message: parsed.message };
  const good = parsed.rows.flatMap((row) => ("patient" in row ? [row.patient] : []));
  const bad = parsed.rows.flatMap((row) => ("errors" in row ? [row] : []));

  const preview = { ready: good.length, problemCount: bad.length, problems: bad.slice(0, 8).map(({ line, errors }) => ({ line, errors })), customColumns: parsed.customColumns, ignoredColumns: parsed.ignoredColumns };
  if (data.get("intent") !== "import") return { preview };
  if (data.get("consent") !== "on") return { message: "Confirm the patients agreed to the data privacy notice.", preview };

  // One at a time so each patient gets its own MRN, audit row and consent stamp.
  for (const patient of good) await createPatient(clinic.id, user.id, { ...patient });
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`);
  return { imported: good.length, skipped: bad.length };
}
