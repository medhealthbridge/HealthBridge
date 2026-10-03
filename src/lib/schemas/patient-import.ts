import { z } from "zod";
import { newPatientSchema } from "@/src/lib/schemas/clinic-app";
import { parseCsv } from "@/src/lib/csv";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1_000_000;

export const PATIENT_IMPORT_HEADER = ["first_name", "last_name", "sex", "birth_date", "mobile", "philhealth_pin", "osca_id", "pwd_id"] as const;

const rowSchema = newPatientSchema.omit({ consent: true });
export type ImportPatient = z.output<typeof rowSchema>;

export type ImportRowResult = { line: number; patient: ImportPatient } | { line: number; errors: string[] };

export type ImportParse = { ok: true; rows: ImportRowResult[] } | { ok: false; message: string };

/** Reads a patients CSV: needs the template's header, at most 500 rows. Each row is validated like the add-patient form. */
export function parsePatientImport(text: string): ImportParse {
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, message: "The file is empty." };
  const header = table[0].map((name) => name.trim().toLowerCase());
  const missing = ["first_name", "last_name", "sex"].filter((name) => !header.includes(name));
  if (missing.length) return { ok: false, message: `Missing column: ${missing.join(", ")}. Download the template to see the columns.` };
  const body = table.slice(1);
  if (body.length === 0) return { ok: false, message: "There are no patient rows under the header." };
  if (body.length > MAX_IMPORT_ROWS) return { ok: false, message: `Import up to ${MAX_IMPORT_ROWS} patients at a time.` };

  const at = (record: string[], name: string) => (record[header.indexOf(name)] ?? "").trim();
  const rows = body.map((record, index): ImportRowResult => {
    const parsed = rowSchema.safeParse({
      firstName: at(record, "first_name"),
      lastName: at(record, "last_name"),
      sex: at(record, "sex").toUpperCase().slice(0, 1),
      dateOfBirth: at(record, "birth_date"),
      phone: at(record, "mobile"),
      philhealth: at(record, "philhealth_pin"),
      oscaId: at(record, "osca_id"),
      pwdId: at(record, "pwd_id"),
    });
    const line = index + 2;
    return parsed.success ? { line, patient: parsed.data } : { line, errors: Object.values(z.flattenError(parsed.error).fieldErrors).flat().filter((message): message is string => Boolean(message)) };
  });
  return { ok: true, rows };
}
