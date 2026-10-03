import { and, desc, eq } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, hmoClaims, invoices, patients } from "@/src/server/db/schema";
import { OPEN_STATUSES, type ClaimInput, type ClaimStatus } from "@/src/lib/schemas/claim";
import { NotFoundError } from "./clinic-app";

export class ClaimNotFoundError extends Error {}
export class UnknownReceiptError extends Error {}
export class ClaimClosedError extends Error {}

export type ClaimRow = {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  payorType: string;
  payorName: string;
  memberOrPolicyNumber: string | null;
  loaNumber: string | null;
  claimAmountCents: number;
  status: ClaimStatus;
  receiptNumber: string | null;
  filedAt: Date | null;
  resolvedAt: Date | null;
  notes: string | null;
  ageDays: number;
};

const RESOLVING: ClaimStatus[] = ["approved", "denied", "paid", "withdrawn"];

const patientName = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed patient";

/** Whole days since the claim was filed; the payor-aging number receivables are chased by. */
export function claimAgeDays(filedAt: Date | null, now = Date.now()) {
  return filedAt ? Math.max(0, Math.floor((now - filedAt.getTime()) / 86_400_000)) : 0;
}

export function summarizeClaims(rows: Pick<ClaimRow, "status" | "claimAmountCents" | "ageDays">[]) {
  const open = rows.filter((row) => OPEN_STATUSES.includes(row.status));
  return {
    outstandingCents: open.reduce((total, row) => total + row.claimAmountCents, 0),
    openCount: open.length,
    deniedCount: rows.filter((row) => row.status === "denied").length,
    overSixtyCents: open.filter((row) => row.ageDays > 60).reduce((total, row) => total + row.claimAmountCents, 0),
  };
}

export async function listClaims(clinicId: string): Promise<ClaimRow[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({
        id: hmoClaims.id, patientId: hmoClaims.patientId, payorType: hmoClaims.payorType, payorName: hmoClaims.payorName,
        memberOrPolicyNumber: hmoClaims.memberOrPolicyNumber, loaNumber: hmoClaims.loaNumber, claimAmountCents: hmoClaims.claimAmountCents,
        status: hmoClaims.status, filedAt: hmoClaims.filedAt, resolvedAt: hmoClaims.resolvedAt, notes: hmoClaims.notes,
        firstName: patients.firstName, lastName: patients.lastName, displayName: patients.displayName, mrn: patients.medicalRecordNumber,
        receiptNumber: invoices.invoiceNumber,
      })
      .from(hmoClaims)
      .innerJoin(patients, and(eq(patients.clinicId, hmoClaims.clinicId), eq(patients.id, hmoClaims.patientId)))
      .leftJoin(invoices, and(eq(invoices.clinicId, hmoClaims.clinicId), eq(invoices.id, hmoClaims.invoiceId)))
      .where(eq(hmoClaims.clinicId, clinicId))
      .orderBy(desc(hmoClaims.createdAt));
    return rows.map((row) => ({
      id: row.id, patientId: row.patientId, patientName: patientName(row), patientMrn: row.mrn, payorType: row.payorType, payorName: row.payorName,
      memberOrPolicyNumber: row.memberOrPolicyNumber, loaNumber: row.loaNumber, claimAmountCents: row.claimAmountCents, status: row.status as ClaimStatus,
      receiptNumber: row.receiptNumber, filedAt: row.filedAt, resolvedAt: row.resolvedAt, notes: row.notes, ageDays: claimAgeDays(row.filedAt),
    }));
  });
}

async function invoiceIdFor(tx: Parameters<Parameters<typeof withTenant>[1]>[0], clinicId: string, receiptNumber: string | null) {
  if (!receiptNumber) return null;
  const [row] = await tx.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.clinicId, clinicId), eq(invoices.invoiceNumber, receiptNumber.toUpperCase()))).limit(1);
  if (!row) throw new UnknownReceiptError();
  return row.id;
}

export async function createClaim(clinicId: string, actorUserId: string, input: ClaimInput) {
  return withTenant(clinicId, async (tx) => {
    const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinicId), eq(patients.id, input.patientId))).limit(1);
    if (!patient) throw new NotFoundError("patient");
    const invoiceId = await invoiceIdFor(tx, clinicId, input.receiptNumber);
    const [row] = await tx
      .insert(hmoClaims)
      .values({
        clinicId, patientId: input.patientId, invoiceId, payorType: input.payorType, payorName: input.payorName,
        memberOrPolicyNumber: input.memberOrPolicyNumber, loaNumber: input.loaNumber, claimAmountCents: input.claimAmountCents,
        status: "filed", filedAt: new Date(), notes: input.notes,
      })
      .returning({ id: hmoClaims.id });
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "claim", entityId: row.id, action: "create", diff: { after: { payor: input.payorName, amountCents: input.claimAmountCents, patientId: input.patientId } } });
    return row;
  });
}

/** Edits the details of a claim that is still open. Closed claims (paid, withdrawn) are history. */
export async function updateClaim(clinicId: string, actorUserId: string, claimId: string, input: ClaimInput) {
  await withTenant(clinicId, async (tx) => {
    const [before] = await tx.select().from(hmoClaims).where(and(eq(hmoClaims.clinicId, clinicId), eq(hmoClaims.id, claimId))).for("update").limit(1);
    if (!before) throw new ClaimNotFoundError();
    if (before.status === "paid" || before.status === "withdrawn") throw new ClaimClosedError();
    const invoiceId = await invoiceIdFor(tx, clinicId, input.receiptNumber);
    await tx
      .update(hmoClaims)
      .set({ invoiceId, payorType: input.payorType, payorName: input.payorName, memberOrPolicyNumber: input.memberOrPolicyNumber, loaNumber: input.loaNumber, claimAmountCents: input.claimAmountCents, notes: input.notes })
      .where(eq(hmoClaims.id, claimId));
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "claim", entityId: claimId, action: "update", diff: { before: { payor: before.payorName, amountCents: before.claimAmountCents }, after: { payor: input.payorName, amountCents: input.claimAmountCents } } });
  });
}

/** Moves a claim along: filed → pending → approved/denied → resubmitted → paid. "Withdrawn" is the delete: kept, never counted. */
export async function setClaimStatus(clinicId: string, actorUserId: string, claimId: string, status: ClaimStatus) {
  await withTenant(clinicId, async (tx) => {
    const [before] = await tx.select({ status: hmoClaims.status }).from(hmoClaims).where(and(eq(hmoClaims.clinicId, clinicId), eq(hmoClaims.id, claimId))).for("update").limit(1);
    if (!before) throw new ClaimNotFoundError();
    if (before.status === "paid" || before.status === "withdrawn") throw new ClaimClosedError();
    await tx
      .update(hmoClaims)
      .set({ status, resolvedAt: RESOLVING.includes(status) ? new Date() : null, ...(status === "resubmitted" ? { filedAt: new Date() } : {}) })
      .where(eq(hmoClaims.id, claimId));
    await tx.insert(auditLogs).values({ clinicId, actorUserId, entityType: "claim", entityId: claimId, action: status === "withdrawn" ? "delete" : "update", diff: { before: { status: before.status }, after: { status } } });
  });
}

