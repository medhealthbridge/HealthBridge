import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { withTenant, withPlatformAdmin } from "@/src/server/db/client";
import { auditLogs, clinics, patients, recalls } from "@/src/server/db/schema";
import { clinicLinkOrigin } from "@/src/lib/clinic-host";
import { addMonths } from "@/src/lib/installments";
import { clinicDateString, NotFoundError, type StaffClinic } from "./clinic-app";
import { sendRecallEmail } from "./email";

export class RecallNotFoundError extends Error {}

export type RecallTiming = "overdue" | "soon" | "later";

/** Overdue = past its date; soon = within 30 days. */
export function recallTiming(dueDate: string, today: string): RecallTiming {
  if (dueDate < today) return "overdue";
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 30);
  return dueDate <= limit.toISOString().slice(0, 10) ? "soon" : "later";
}

export type RecallRow = {
  id: string; patientId: string; patientName: string; mrn: string; phone: string | null; email: string | null;
  dueDate: string; status: string; reason: string | null; timing: RecallTiming; notifiedAt: Date | null;
};

const nameOf = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Patient";

/** Open recalls (pending or already reminded), soonest first. Recalls are a to-do list, never a booking. */
export async function listRecalls(clinic: Pick<StaffClinic, "id" | "timezone">): Promise<RecallRow[]> {
  const today = clinicDateString(clinic.timezone);
  return withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .select({ recall: recalls, firstName: patients.firstName, lastName: patients.lastName, displayName: patients.displayName, mrn: patients.medicalRecordNumber, phone: patients.contactPhone, email: patients.contactEmail })
      .from(recalls)
      .innerJoin(patients, and(eq(patients.clinicId, recalls.clinicId), eq(patients.id, recalls.patientId)))
      // Archived patients drop off the list: no one should be chasing them.
      .where(and(eq(recalls.clinicId, clinic.id), inArray(recalls.status, ["pending", "notified"]), isNull(patients.deletedAt)))
      .orderBy(asc(recalls.dueDate))
      .limit(300);
    return rows.map(({ recall, ...patient }) => ({
      id: recall.id, patientId: recall.patientId, patientName: nameOf(patient), mrn: patient.mrn, phone: patient.phone, email: patient.email,
      dueDate: recall.dueDate, status: recall.status, reason: recall.notes, timing: recallTiming(recall.dueDate, today), notifiedAt: recall.notifiedAt,
    }));
  });
}

export async function createRecall(clinic: Pick<StaffClinic, "id">, actorUserId: string, input: { patientId: string; months?: number; dueOn?: string; reason: string | null }, today: string) {
  const dueDate = input.dueOn ?? addMonths(today, input.months ?? 6);
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, input.patientId), isNull(patients.deletedAt))).limit(1);
    if (!patient) throw new NotFoundError("patient");
    const [row] = await tx.insert(recalls).values({ clinicId: clinic.id, patientId: input.patientId, recallType: "dental_recall", dueDate, notes: input.reason }).returning({ id: recalls.id });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "recall", entityId: row.id, action: "create", diff: { after: { patientId: input.patientId, dueDate } } });
    return row;
  });
}

/** Done (they came back, or it's no longer needed). Both close the reminder; neither deletes it. */
export async function closeRecall(clinic: Pick<StaffClinic, "id">, actorUserId: string, recallId: string, outcome: "completed" | "cancelled") {
  await withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .update(recalls)
      .set({ status: outcome, completedAt: outcome === "completed" ? new Date() : null })
      .where(and(eq(recalls.clinicId, clinic.id), eq(recalls.id, recallId), inArray(recalls.status, ["pending", "notified"])))
      .returning({ id: recalls.id });
    if (rows.length === 0) throw new RecallNotFoundError();
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "recall", entityId: recallId, action: outcome === "cancelled" ? "delete" : "update", diff: { after: { status: outcome } } });
  });
}

/** Emails one recall reminder (no clinical detail). Marks it notified. Returns false if the patient has no email. */
export async function sendRecallReminder(clinic: Pick<StaffClinic, "id" | "name" | "subdomain" | "timezone">, actorUserId: string | null, recallId: string) {
  const target = await withTenant(clinic.id, async (tx) => {
    const [row] = await tx
      .select({ recall: recalls, email: patients.contactEmail, phone: clinics.phone })
      .from(recalls)
      .innerJoin(patients, and(eq(patients.clinicId, recalls.clinicId), eq(patients.id, recalls.patientId)))
      .innerJoin(clinics, eq(clinics.id, recalls.clinicId))
      .where(and(eq(recalls.clinicId, clinic.id), eq(recalls.id, recallId), inArray(recalls.status, ["pending", "notified"]), isNull(patients.deletedAt)))
      .limit(1);
    return row ?? null;
  });
  if (!target) throw new RecallNotFoundError();
  if (!target.email) return false;
  // Claim before sending, so the daily job and a "Send reminder" tap at the same moment send one email, not two.
  // The claim only succeeds if no one has touched notified_at since we read it.
  const before = { status: target.recall.status, notifiedAt: target.recall.notifiedAt };
  const claimed = await withTenant(clinic.id, (tx) =>
    tx.update(recalls).set({ status: "notified", notifiedAt: new Date() })
      .where(and(eq(recalls.clinicId, clinic.id), eq(recalls.id, recallId), before.notifiedAt
        ? sql`date_trunc('milliseconds', ${recalls.notifiedAt}) = ${before.notifiedAt.toISOString()}::timestamptz`
        : isNull(recalls.notifiedAt)))
      .returning({ id: recalls.id }),
  );
  if (claimed.length === 0) return true; // someone else is sending it right now
  try {
    await sendRecallEmail(target.email, { name: clinic.name, phone: target.phone }, target.recall.notes, clinicLinkOrigin(clinic.subdomain));
  } catch (error) {
    console.error("[email] recall reminder failed:", error instanceof Error ? error.message : "unknown");
    // Put it back so it can be tried again.
    await withTenant(clinic.id, (tx) => tx.update(recalls).set(before).where(and(eq(recalls.clinicId, clinic.id), eq(recalls.id, recallId))));
    return false;
  }
  await withTenant(clinic.id, async (tx) => {
    if (actorUserId) await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "recall", entityId: recallId, action: "update", diff: { reminderSent: true } });
  });
  return true;
}

/** The daily job's recall step: for clinics with reminders on, remind patients whose recall is due within a week and who haven't been reminded. */
export async function runDailyRecalls() {
  const enabled = await withPlatformAdmin((tx) => tx.select({ id: clinics.id, name: clinics.name, subdomain: clinics.subdomain, timezone: clinics.timezone }).from(clinics).where(eq(clinics.remindersEnabled, true)));
  let sent = 0;
  for (const clinic of enabled) {
    const today = clinicDateString(clinic.timezone);
    const limit = new Date(`${today}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + 7);
    const due = await withTenant(clinic.id, (tx) =>
      tx.select({ id: recalls.id }).from(recalls)
        .innerJoin(patients, and(eq(patients.clinicId, recalls.clinicId), eq(patients.id, recalls.patientId)))
        .where(and(eq(recalls.clinicId, clinic.id), eq(recalls.status, "pending"), isNull(patients.deletedAt), lte(recalls.dueDate, limit.toISOString().slice(0, 10)))).limit(100),
    );
    for (const recall of due) if (await sendRecallReminder(clinic, null, recall.id)) sent++;
  }
  return { clinics: enabled.length, sent };
}

