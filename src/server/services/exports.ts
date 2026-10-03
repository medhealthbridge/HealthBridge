import { withTenant } from "@/src/server/db/client";
import { auditLogs } from "@/src/server/db/schema";
import { toCsv } from "@/src/lib/csv";
import { listClaims } from "./claims";
import { clinicDateString, listPatients, type StaffClinic } from "./clinic-app";
import { listInventory } from "./inventory";
import { listInvoices } from "./billing";

export const EXPORT_KINDS = ["patients", "receipts", "inventory", "claims"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

const peso = (cents: number) => (cents / 100).toFixed(2);
const day = (date: Date | null, timezone: string) => (date ? clinicDateString(timezone, date) : "");

/** One CSV per kind. Owner only (the route enforces it) and every export leaves an audit row. */
export async function buildExport(clinic: Pick<StaffClinic, "id" | "timezone">, actorUserId: string, kind: ExportKind) {
  let csv: string;
  if (kind === "patients") {
    const { rows } = await listPatients(clinic.id, "", false);
    csv = toCsv(
      ["mrn", "first_name", "last_name", "sex", "birth_date", "mobile", "philhealth_pin", "osca_id", "pwd_id", "added"],
      rows.map((row) => [row.mrn, row.firstName, row.lastName, row.sex, row.dateOfBirth, row.phone, row.philhealth, row.oscaId, row.pwdId, day(row.createdAt, clinic.timezone)]),
    );
  } else if (kind === "receipts") {
    const rows = await listInvoices(clinic.id, { limit: 5000 });
    csv = toCsv(["receipt", "date", "patient", "mrn", "paid_by", "total_php", "status"], rows.map((row) => [row.invoiceNumber, day(row.issuedAt, clinic.timezone), row.patientName, row.patientMrn, row.method, peso(row.totalCents), row.status]));
  } else if (kind === "inventory") {
    const rows = await listInventory(clinic.id, clinicDateString(clinic.timezone));
    csv = toCsv(["item", "sku", "unit", "in_stock", "reorder_at", "next_expiry", "expired_qty", "status"], rows.map((row) => [row.name, row.sku, row.unit, row.onHand, row.reorderThreshold, row.nextExpiry, row.expiredQty, row.status]));
  } else {
    const rows = await listClaims(clinic.id);
    csv = toCsv(["patient", "mrn", "payor_type", "payor", "member_or_policy", "loa", "receipt", "amount_php", "status", "filed", "resolved"], rows.map((row) => [row.patientName, row.patientMrn, row.payorType, row.payorName, row.memberOrPolicyNumber, row.loaNumber, row.receiptNumber, peso(row.claimAmountCents), row.status, day(row.filedAt, clinic.timezone), day(row.resolvedAt, clinic.timezone)]));
  }
  await withTenant(clinic.id, (tx) => tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "export", entityId: clinic.id, action: "view", diff: { kind } }));
  return csv;
}
