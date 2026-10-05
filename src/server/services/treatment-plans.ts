import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, dentalChartEntries, patients, services, treatmentPlanItems, treatmentPlans } from "@/src/server/db/schema";
import type { PlanItemStatus, PlanStatus } from "@/src/server/db/schema/dental";
import { CODE_BY_KEY, normalizeSurfaces, type ChartEntryInput } from "@/src/lib/dental-chart";
import { nextPlanStatus, planSummary } from "@/src/lib/plan-totals";
import { clinicDateString, NotFoundError, type StaffClinic } from "./clinic-app";
import { insertChartEntry } from "./dental-chart";

export class PlanNotFoundError extends Error {}
export class PlanItemNotFoundError extends Error {}
export class PlanLockedError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

type Actor = Pick<StaffClinic, "id" | "staffId" | "role"> & { timezone?: string };
type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

export type PlanItem = {
  id: string; phase: number; serviceId: string | null; description: string; tooth: number | null; surfaces: string | null; chartCode: string | null;
  quantity: number; unitPriceCents: number; vatExempt: boolean; status: PlanItemStatus; doneAt: Date | null; invoiceId: string | null;
};
export type TreatmentPlan = {
  id: string; patientId: string; title: string; status: PlanStatus; phaseLabels: string[]; notes: string | null; acceptedAt: Date | null; createdAt: Date;
  items: PlanItem[];
  summary: ReturnType<typeof planSummary>;
};

export type PlanItemInput = {
  serviceId: string | null;
  /** Needed (and owner-only) when there's no service from the price list. */
  description: string;
  unitPriceCents: number | null;
  phase: number;
  tooth: number | null;
  surfaces: string | null;
  chartCode: string | null;
  quantity: number;
};

const toItem = (row: typeof treatmentPlanItems.$inferSelect): PlanItem => ({
  id: row.id, phase: row.phase, serviceId: row.serviceId, description: row.description, tooth: row.tooth, surfaces: row.surfaces, chartCode: row.chartCode, quantity: row.quantity,
  unitPriceCents: row.unitPriceCents, vatExempt: row.vatExempt, status: row.status, doneAt: row.doneAt, invoiceId: row.invoiceId,
});

export async function listPlans(clinicId: string, patientId: string): Promise<TreatmentPlan[]> {
  return withTenant(clinicId, async (tx) => {
    const plans = await tx.select().from(treatmentPlans).where(and(eq(treatmentPlans.clinicId, clinicId), eq(treatmentPlans.patientId, patientId))).orderBy(desc(treatmentPlans.createdAt));
    if (plans.length === 0) return [];
    const items = await tx.select().from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinicId), inArray(treatmentPlanItems.planId, plans.map((plan) => plan.id)))).orderBy(asc(treatmentPlanItems.phase), asc(treatmentPlanItems.sortOrder), asc(treatmentPlanItems.createdAt));
    return plans.map((plan) => {
      const mine = items.filter((item) => item.planId === plan.id).map(toItem);
      return { id: plan.id, patientId: plan.patientId, title: plan.title, status: plan.status, phaseLabels: plan.phaseLabels, notes: plan.notes, acceptedAt: plan.acceptedAt, createdAt: plan.createdAt, items: mine, summary: planSummary(mine) };
    });
  });
}

/** Plan items still to be billed (not cancelled, not on a receipt), for the checkout screen. */
export async function listBillablePlanItems(clinicId: string) {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ item: treatmentPlanItems, planTitle: treatmentPlans.title, patientId: treatmentPlans.patientId })
      .from(treatmentPlanItems)
      .innerJoin(treatmentPlans, and(eq(treatmentPlans.clinicId, treatmentPlanItems.clinicId), eq(treatmentPlans.id, treatmentPlanItems.planId)))
      .where(and(eq(treatmentPlanItems.clinicId, clinicId), isNull(treatmentPlanItems.invoiceId), ne(treatmentPlanItems.status, "cancelled"), ne(treatmentPlans.status, "cancelled"), ne(treatmentPlans.status, "draft")))
      .orderBy(asc(treatmentPlanItems.phase), asc(treatmentPlanItems.sortOrder))
      .limit(500);
    return rows.map(({ item, planTitle, patientId }) => ({ id: item.id, patientId, planTitle, phase: item.phase, description: item.description, tooth: item.tooth, surfaces: item.surfaces, quantity: item.quantity, unitPriceCents: item.unitPriceCents, vatExempt: item.vatExempt, status: item.status as string }));
  });
}

async function loadPlan(tx: Tx, clinic: Actor, planId: string) {
  const [plan] = await tx.select().from(treatmentPlans).where(and(eq(treatmentPlans.clinicId, clinic.id), eq(treatmentPlans.id, planId))).for("update").limit(1);
  if (!plan) throw new PlanNotFoundError();
  return plan;
}

/** After any change to items, bring the plan's status into step with them. */
async function refreshStatus(tx: Tx, clinic: Actor, plan: typeof treatmentPlans.$inferSelect) {
  const items = (await tx.select().from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinic.id), eq(treatmentPlanItems.planId, plan.id)))).map(toItem);
  const next = nextPlanStatus(plan.status, items);
  if (next !== plan.status) await tx.update(treatmentPlans).set({ status: next }).where(eq(treatmentPlans.id, plan.id));
}

export async function createPlan(clinic: Actor, actorUserId: string, patientId: string, input: { title: string; notes: string | null; phaseLabels: string[] }) {
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.clinicId, clinic.id), eq(patients.id, patientId), isNull(patients.deletedAt))).limit(1);
    if (!patient) throw new NotFoundError("patient");
    const [row] = await tx.insert(treatmentPlans).values({ clinicId: clinic.id, patientId, title: input.title, notes: input.notes, phaseLabels: input.phaseLabels, createdByStaffId: clinic.staffId }).returning({ id: treatmentPlans.id });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: row.id, action: "create", diff: { after: { patientId, title: input.title } } });
    return row;
  });
}

/** draft → proposed → accepted are staff steps (the patient agreed); cancelling needs nothing billed. */
export async function setPlanStatus(clinic: Actor, actorUserId: string, planId: string, status: "draft" | "proposed" | "accepted" | "cancelled") {
  await withTenant(clinic.id, async (tx) => {
    const plan = await loadPlan(tx, clinic, planId);
    if (plan.status === "cancelled" && status !== "draft") throw new PlanLockedError("A cancelled plan can only be reopened as a draft.");
    if (status === "cancelled") {
      const [billed] = await tx.select({ id: treatmentPlanItems.id }).from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinic.id), eq(treatmentPlanItems.planId, planId), ne(treatmentPlanItems.status, "cancelled"), eq(treatmentPlanItems.status, "done"))).limit(1);
      if (billed) throw new PlanLockedError("This plan has finished work. Cancel the unfinished items instead.");
    }
    await tx.update(treatmentPlans).set({ status, acceptedAt: status === "accepted" ? new Date() : plan.acceptedAt }).where(eq(treatmentPlans.id, planId));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: planId, action: status === "cancelled" ? "delete" : "update", diff: { before: { status: plan.status }, after: { status } } });
  });
}

export async function addPlanItem(clinic: Actor, actorUserId: string, planId: string, input: PlanItemInput) {
  return withTenant(clinic.id, async (tx) => {
    const plan = await loadPlan(tx, clinic, planId);
    if (plan.status === "cancelled" || plan.status === "completed") throw new PlanLockedError("Reopen the plan to add work.");
    let description = input.description;
    let unitPriceCents = input.unitPriceCents ?? 0;
    let vatExempt = false;
    const chartCode = input.chartCode && CODE_BY_KEY.has(input.chartCode) ? input.chartCode : null;
    if (input.serviceId) {
      const [service] = await tx.select().from(services).where(and(eq(services.clinicId, clinic.id), eq(services.id, input.serviceId), isNull(services.deletedAt))).limit(1);
      if (!service) throw new PlanItemNotFoundError();
      description = description || service.name;
      // The price list sets the price. Only the owner may agree a different one for this patient.
      unitPriceCents = clinic.role === "owner" && input.unitPriceCents !== null ? input.unitPriceCents : service.priceCentavos;
      vatExempt = service.vatExempt;
    } else if (clinic.role !== "owner") {
      throw new PlanLockedError("Pick a service from the price list. Only the owner can add custom work.");
    }
    const [{ next }] = await tx.select({ next: treatmentPlanItems.sortOrder }).from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinic.id), eq(treatmentPlanItems.planId, planId))).orderBy(desc(treatmentPlanItems.sortOrder)).limit(1).then((rows) => (rows.length ? rows : [{ next: 0 }]));
    const [row] = await tx
      .insert(treatmentPlanItems)
      .values({ clinicId: clinic.id, planId, phase: input.phase, serviceId: input.serviceId, description, tooth: input.tooth, surfaces: input.surfaces ? normalizeSurfaces(input.surfaces) || null : null, chartCode, quantity: input.quantity, unitPriceCents, vatExempt, sortOrder: next + 1 })
      .returning({ id: treatmentPlanItems.id });
    await refreshStatus(tx, clinic, plan);
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: planId, action: "update", diff: { itemAdded: { itemId: row.id, description, tooth: input.tooth, priceCents: unitPriceCents } } });
    return row;
  });
}

async function loadItem(tx: Tx, clinic: Actor, itemId: string) {
  const [item] = await tx.select().from(treatmentPlanItems).where(and(eq(treatmentPlanItems.clinicId, clinic.id), eq(treatmentPlanItems.id, itemId))).for("update").limit(1);
  if (!item) throw new PlanItemNotFoundError();
  return item;
}

/** Cancelling is the delete: the item stays on the plan, struck through, and leaves the estimate. Billed items must be voided on the receipt first. */
export async function cancelPlanItem(clinic: Actor, actorUserId: string, itemId: string) {
  await withTenant(clinic.id, async (tx) => {
    const item = await loadItem(tx, clinic, itemId);
    if (item.invoiceId) throw new PlanLockedError("This item is on a receipt. Void the receipt first.");
    if (item.status === "done") throw new PlanLockedError("This work is done. Mark it not done first.");
    await tx.update(treatmentPlanItems).set({ status: "cancelled" }).where(eq(treatmentPlanItems.id, itemId));
    await refreshStatus(tx, clinic, await loadPlan(tx, clinic, item.planId));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: item.planId, action: "delete", diff: { itemCancelled: { itemId, description: item.description } } });
  });
}

/** Work finished on the patient. If it has a tooth and a chart code, the tooth chart records it in the same step. */
export async function markPlanItemDone(clinic: Actor, actorUserId: string, itemId: string, appointmentId: string | null = null) {
  await withTenant(clinic.id, async (tx) => {
    const item = await loadItem(tx, clinic, itemId);
    if (item.status !== "planned") throw new PlanLockedError("Only planned work can be marked done.");
    const plan = await loadPlan(tx, clinic, item.planId);
    if (plan.status === "cancelled") throw new PlanLockedError("This plan is cancelled.");
    await tx.update(treatmentPlanItems).set({ status: "done", doneAt: new Date(), doneByStaffId: clinic.staffId }).where(eq(treatmentPlanItems.id, itemId));
    if (item.tooth && item.chartCode && CODE_BY_KEY.has(item.chartCode)) {
      await insertChartEntry(tx, clinic, actorUserId, plan.patientId, { tooth: item.tooth as ChartEntryInput["tooth"], code: item.chartCode, surfaces: item.surfaces ?? "", note: item.description, occurredOn: clinicDateString(clinic.timezone ?? "Asia/Manila") }, { planItemId: itemId, appointmentId });
    }
    await refreshStatus(tx, clinic, plan);
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: item.planId, action: "update", diff: { itemDone: { itemId, description: item.description, tooth: item.tooth } } });
  });
}

/** Undo "done": the tooth entry this created is voided with a reason, so the chart stays honest. */
export async function markPlanItemNotDone(clinic: Actor, actorUserId: string, itemId: string) {
  await withTenant(clinic.id, async (tx) => {
    const item = await loadItem(tx, clinic, itemId);
    if (item.status !== "done") throw new PlanLockedError("This work isn't marked done.");
    const plan = await loadPlan(tx, clinic, item.planId);
    await tx.update(treatmentPlanItems).set({ status: "planned", doneAt: null, doneByStaffId: null }).where(eq(treatmentPlanItems.id, itemId));
    await tx.update(dentalChartEntries).set({ voidedAt: new Date(), voidReason: "Marked not done on the treatment plan" }).where(and(eq(dentalChartEntries.clinicId, clinic.id), eq(dentalChartEntries.planItemId, itemId), isNull(dentalChartEntries.voidedAt)));
    await refreshStatus(tx, clinic, plan);
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "treatment_plan", entityId: item.planId, action: "update", diff: { itemUndone: { itemId, description: item.description } } });
  });
}
