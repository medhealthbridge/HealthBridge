import { toCsv } from "@/src/lib/csv";
import { PATIENT_IMPORT_HEADER } from "@/src/lib/schemas/patient-import";

/** The blank patients CSV, with one example row. Contains no data and needs no sign-in. */
export function GET() {
  const csv = toCsv([...PATIENT_IMPORT_HEADER], [["Maria", "Santos", "F", "1990-05-01", "0917 555 4412", "12-345678901-2", "", ""]]);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="patients-template.csv"' } });
}
