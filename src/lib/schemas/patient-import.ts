import { z } from "zod";
import { newPatientSchema } from "@/src/lib/schemas/clinic-app";
import { parseCsv } from "@/src/lib/csv";
import { matchFieldByHeader, validateCustomFields, type FieldDefinition } from "@/src/lib/patient-fields";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1_000_000;

export const PATIENT_IMPORT_HEADER = ["first_name", "last_name", "sex", "birth_date", "mobile", "philhealth_pin", "osca_id", "pwd_id"] as const;

const rowSchema = newPatientSchema.omit({ consent: true });
export type ImportPatient = z.output<typeof rowSchema> & { customFields: Record<string, unknown> };

export type ImportRowResult = { line: number; patient: ImportPatient } | { line: number; errors: string[] };

export type ImportParse =
  | {
      ok: true;
      rows: ImportRowResult[];
      /** Columns that matched one of the clinic's own fields, by label. */
      customColumns: string[];
      /** Columns that matched nothing and were left out, so a typo doesn't silently drop data. */
      ignoredColumns: string[];
    }
  | { ok: false; message: string };

const BUILT_IN_COLUMNS: string[] = [...PATIENT_IMPORT_HEADER];

/**
 * Reads a patients CSV: needs the template's header, at most 500 rows. Each row is
 * validated like the add-patient form. A column named like one of the clinic's own
 * fields (its label or key) fills that field; pick-several answers are separated by ";".
 */
export function parsePatientImport(text: string, fields: Pick<FieldDefinition, "key" | "label" | "type" | "options" | "required">[] = []): ImportParse {
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, message: "The file is empty." };
  const header = table[0].map((name) => name.trim().toLowerCase());
  const missing = ["first_name", "last_name", "sex"].filter((name) => !header.includes(name));
  if (missing.length) return { ok: false, message: `Missing column: ${missing.join(", ")}. Download the template to see the columns.` };
  const body = table.slice(1);
  if (body.length === 0) return { ok: false, message: "There are no patient rows under the header." };
  if (body.length > MAX_IMPORT_ROWS) return { ok: false, message: `Import up to ${MAX_IMPORT_ROWS} patients at a time.` };

  const at = (record: string[], name: string) => (record[header.indexOf(name)] ?? "").trim();
  const custom = header.flatMap((name, column) => {
    const field = BUILT_IN_COLUMNS.includes(name) ? undefined : matchFieldByHeader(fields, name);
    return field ? [{ field, column }] : [];
  });
  const ignoredColumns = table[0].map((name) => name.trim()).filter((name, column) => name && !BUILT_IN_COLUMNS.includes(header[column]) && !custom.some((entry) => entry.column === column));
  // Required fields must be in the file at all, or every row would fail the same way.
  const absent = fields.filter((field) => field.required && !custom.some((entry) => entry.field.key === field.key));
  if (absent.length) return { ok: false, message: `Missing required column: ${absent.map((field) => field.label).join(", ")}. Download the template to see the columns.` };
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
    const answers = Object.fromEntries(
      custom.map(({ field, column }) => {
        const cell = (record[column] ?? "").trim();
        return [field.key, field.type === "multi_select" ? cell.split(";").map((part) => part.trim()).filter(Boolean) : cell];
      }),
    );
    const checked = validateCustomFields(fields.filter((field) => custom.some((entry) => entry.field.key === field.key)), answers);
    const problems = [
      ...(parsed.success ? [] : Object.values(z.flattenError(parsed.error).fieldErrors).flat().filter((message): message is string => Boolean(message))),
      ...checked.errors,
    ];
    if (!parsed.success || problems.length) return { line, errors: problems };
    return { line, patient: { ...parsed.data, customFields: Object.fromEntries(Object.entries(checked.values).filter(([, value]) => value !== null)) } };
  });
  return { ok: true, rows, customColumns: custom.map((entry) => entry.field.label), ignoredColumns };
}
