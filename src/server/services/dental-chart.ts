import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, clinicStaff, dentalChartEntries, patients, user } from "@/src/server/db/schema";
import { CODE_BY_KEY, type ChartEntryInput } from "@/src/lib/dental-chart";
import { clinicDateString, NotFoundError, type StaffClinic } from "./clinic-app";

export class ChartEntryNotFoundError extends Error {}

type Actor = Pick<StaffClinic, "id" | "staffId"> & { timezone?: string };
type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

export type ChartEntryRow = {
  id: string;
  tooth: number;
  surfaces: string | null;
  kind: "condition" | "procedure";
  code: string;
  note: string | null;
  occurredOn: string;
  createdAt: Date;
  authorName: string | null;
  planItemId: string | null;
  voided: boolean;
  voidReason: string | null;
};

/** Every entry for a patient, oldest first. Voided ones are included and marked: the chart keeps its history. */
export async function listChartEntries(clinicId: string, patientId: string): Promise<ChartEntryRow[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ entry: dentalChartEntries, authorName: user.name })
      .from(dentalChartEntries)
      .leftJoin(clinicStaff, and(eq(clinicStaff.clinicId, dentalChartEntries.clinicId), eq(clinicStaff.id, dentalChartEntries.authorStaffId)))
      .leftJoin(user, eq(user.id, clinicStaff.userId))
      .where(and(eq(dentalChartEntries.clinicId, clinicId), eq(dentalChartEntries.patientId, patientId)))
      .orderBy(asc(dentalChartEntries.occurredOn), asc(dentalChartEntries.createdAt));
    return rows.map(({ entry, authorName }) => ({
      id: entry.id, tooth: entry.tooth, surfaces: entry.surfaces, kind: entry.kind as "condition" | "procedure", code: entry.code, note: entry.note,
      occurredOn: entry.occurredOn, createdAt: entry.createdAt, authorName, planItemId: entry.planItemId, voided: entry.voidedAt !== null, voidReason: entry.voidReason,
    }));
  });
}

export async function insertChartEntry(tx: Tx, clinic: Actor, actorUserId: string, patientId: string, input: ChartEntryInput, extra: { planItemId?: string | null; appointmentId?: string | null } = {}) {
  const spec = CODE_BY_KEY.get(input.code)!;
  const [row] = await tx
    .insert(dentalChartEntries)
    .values({
      clinicId: clinic.id, patientId, tooth: input.tooth, surfaces: spec.surfaces ? input.surfaces || null : null, kind: spec.kind, code: input.code, note: input.note,
      occurredOn: input.occurredOn ?? clinicDateString(clinic.timezone ?? "Asia/Manila"), planItemId: extra.planItemId ?? null, appointmentId: extra.appointmentId ?? null, authorStaffId: clinic.staffId,
    })
    .returning({ id: dentalChartEntries.id });
  await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "dental_chart", entityId: row.id, action: "create", diff: { after: { patientId, tooth: input.tooth, code: input.code, surfaces: input.surfaces || null } } });
  return row;
}

/** Owner and practitioners record a finding or work done. Opening a chart is also a patient-record view (audited by the chart page). */
export async function addChartEntry(clinic: Actor, actorUserId: string, patientId: string, input: ChartEntryInput) {
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, patientId), isNull(patients.deletedAt))).limit(1);
    if (!patient) throw new NotFoundError("patient");
    return insertChartEntry(tx, clinic, actorUserId, patientId, input);
  });
}

/** The delete: a mistaken entry is voided with a reason and stays in the history. */
export async function voidChartEntry(clinic: Actor, actorUserId: string, entryId: string, reason: string) {
  await withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .update(dentalChartEntries)
      .set({ voidedAt: new Date(), voidReason: reason })
      .where(and(eq(dentalChartEntries.clinicId, clinic.id), eq(dentalChartEntries.id, entryId), isNull(dentalChartEntries.voidedAt)))
      .returning({ id: dentalChartEntries.id });
    if (rows.length === 0) throw new ChartEntryNotFoundError();
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "dental_chart", entityId: entryId, action: "delete", diff: { after: { voided: true, reason } } });
  });
}

export async function recentChartEntries(clinicId: string, patientId: string, limit = 20) {
  return withTenant(clinicId, (tx) =>
    tx.select().from(dentalChartEntries).where(and(eq(dentalChartEntries.clinicId, clinicId), eq(dentalChartEntries.patientId, patientId), isNull(dentalChartEntries.voidedAt))).orderBy(desc(dentalChartEntries.occurredOn)).limit(limit),
  );
}
