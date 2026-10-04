import { toCsv } from "@/src/lib/csv";
import { PATIENT_IMPORT_HEADER } from "@/src/lib/schemas/patient-import";
import { getAgentClinic } from "@/src/server/auth";
import { listFieldDefinitions } from "@/src/server/services/patient-fields";

const EXAMPLE_BY_TYPE = { text: "", long_text: "", number: "0", date: "2026-01-31", yes_no: "yes", select: "", multi_select: "" } as const;

/**
 * The patients CSV template with one example row. It holds no patient data. A signed-in
 * owner also gets a column for each of their clinic's own fields (the field names are not secret to them).
 */
export async function GET() {
  const ctx = await getAgentClinic();
  const fields = ctx?.clinic.role === "owner" ? (await listFieldDefinitions(ctx.clinic.id)).filter((field) => !field.archived) : [];
  const csv = toCsv(
    [...PATIENT_IMPORT_HEADER, ...fields.map((field) => field.label)],
    [["Maria", "Santos", "F", "1990-05-01", "0917 555 4412", "12-345678901-2", "", "", ...fields.map((field) => (field.options[0] ?? EXAMPLE_BY_TYPE[field.type]))]],
  );
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="patients-template.csv"' } });
}
