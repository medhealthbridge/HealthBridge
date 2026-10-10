"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveClinic, requireClinicRole } from "@/src/server/auth";
import { NotFoundError, clinicDateString } from "@/src/server/services/clinic-app";
import { addChartEntry, ChartEntryNotFoundError, voidChartEntry } from "@/src/server/services/dental-chart";
import {
  addPlanItem, cancelPlanItem, createPlan, markPlanItemDone, markPlanItemNotDone, PlanItemNotFoundError, PlanLockedError, PlanNotFoundError, restorePlanItem, setPlanStatus,
} from "@/src/server/services/treatment-plans";
import { closeRecall, createRecall, RecallNotFoundError, sendRecallReminder } from "@/src/server/services/recalls";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { chartEntrySchema } from "@/src/lib/dental-chart";
import { chartVoidSchema, itemIdSchema, planInputSchema, planItemSchema, planStatusSchema, recallInputSchema } from "@/src/lib/schemas/dental";

export type DentalState = { message?: string; fieldErrors?: Record<string, string[] | undefined>; saved?: string };

const LIMIT = { max: 200, windowSeconds: 60 * 60 };
const text = (data: FormData, key: string) => (typeof data.get(key) === "string" ? (data.get(key) as string) : "");

function refresh() {
  revalidatePath(CLINIX_ROUTES.app, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/patients`, "layout");
  revalidatePath(`${CLINIX_ROUTES.admin}/recalls`);
}

/** Same ceiling as the price list: ₱1,000,000 per item. */
const MAX_PRICE_PESOS = 1_000_000;
const pesosToCents = (value: string) => {
  const number = Number(value.replace(/[,₱\s]/g, ""));
  return value.trim() === "" || !Number.isFinite(number) || number < 0 || number > MAX_PRICE_PESOS ? null : Math.round(number * 100);
};

/** Every write here shares one budget per person, so a stuck button or a script can't flood the chart or the plan. */
async function withinLimit(userId: string) {
  return (await consumeRateLimit("clinic-write", userId, LIMIT)).allowed;
}
const TOO_MANY = { message: "Too many changes in a short time. Wait a moment and try again." };

function planProblem(error: unknown): string {
  if (error instanceof PlanLockedError) return error.reason;
  if (error instanceof PlanNotFoundError) return "That plan no longer exists.";
  if (error instanceof PlanItemNotFoundError) return "That item (or its service) no longer exists.";
  if (error instanceof NotFoundError) return "That patient could not be found.";
  throw error;
}

// ---- treatment plans: the doctors (owner, practitioner) write; the front desk may record that the patient agreed ----

export async function createPlanAction(_prev: DentalState, data: FormData): Promise<DentalState> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = planInputSchema.safeParse({ patientId: text(data, "patientId"), title: text(data, "title"), notes: text(data, "notes"), phaseLabels: text(data, "phaseLabels") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await createPlan(clinic, user.id, parsed.data.patientId, { title: parsed.data.title, notes: parsed.data.notes, phaseLabels: parsed.data.phaseLabels });
  } catch (error) {
    return { message: planProblem(error) };
  }
  refresh();
  return { saved: parsed.data.title };
}

export async function addPlanItemAction(_prev: DentalState, data: FormData): Promise<DentalState> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };
  const parsed = planItemSchema.safeParse(Object.fromEntries(["planId", "serviceId", "description", "price", "phase", "tooth", "surfaces", "chartCode", "quantity"].map((key) => [key, text(data, key)])));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const price = pesosToCents(parsed.data.price);
  if (!parsed.data.serviceId && price === null) return { fieldErrors: { price: [`Enter the price for this custom work (up to ₱${MAX_PRICE_PESOS.toLocaleString("en-PH")}).`] } };
  try {
    await addPlanItem(clinic, user.id, parsed.data.planId, { serviceId: parsed.data.serviceId, description: parsed.data.description, unitPriceCents: price, phase: parsed.data.phase, tooth: parsed.data.tooth, surfaces: parsed.data.surfaces, chartCode: parsed.data.chartCode, quantity: parsed.data.quantity });
  } catch (error) {
    return { message: planProblem(error) };
  }
  refresh();
  return { saved: "Added to the plan" };
}

export async function setPlanStatusAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireActiveClinic();
  if (!(await withinLimit(user.id))) return TOO_MANY;
  const parsed = planStatusSchema.safeParse({ planId: text(data, "planId"), status: text(data, "status") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  // Recording that the patient agreed is front-desk work too; cancelling or reopening is the doctors'.
  if (clinic.role === "assistant" && parsed.data.status !== "accepted" && parsed.data.status !== "proposed") return { message: "Only the dentist or owner can do that." };
  try {
    await setPlanStatus(clinic, user.id, parsed.data.planId, parsed.data.status);
  } catch (error) {
    return { message: planProblem(error) };
  }
  refresh();
  return {};
}

async function itemAction(data: FormData, run: (clinic: Awaited<ReturnType<typeof requireClinicRole>>["clinic"], userId: string, itemId: string) => Promise<void>) {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  if (!(await withinLimit(user.id))) return TOO_MANY;
  const parsed = itemIdSchema.safeParse({ itemId: text(data, "itemId") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await run(clinic, user.id, parsed.data.itemId);
  } catch (error) {
    return { message: planProblem(error) };
  }
  refresh();
  return {};
}

export async function markItemDoneAction(data: FormData): Promise<{ message?: string }> {
  return itemAction(data, (clinic, userId, itemId) => markPlanItemDone({ ...clinic }, userId, itemId));
}
export async function markItemNotDoneAction(data: FormData): Promise<{ message?: string }> {
  return itemAction(data, (clinic, userId, itemId) => markPlanItemNotDone(clinic, userId, itemId));
}
export async function cancelItemAction(data: FormData): Promise<{ message?: string }> {
  return itemAction(data, (clinic, userId, itemId) => cancelPlanItem(clinic, userId, itemId));
}
export async function restoreItemAction(data: FormData): Promise<{ message?: string }> {
  return itemAction(data, (clinic, userId, itemId) => restorePlanItem(clinic, userId, itemId));
}

// ---- tooth chart: clinical, so owner and practitioners only ----

export async function addChartEntryAction(_prev: DentalState, data: FormData): Promise<DentalState> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  const limit = await consumeRateLimit("clinic-write", user.id, LIMIT);
  if (!limit.allowed) return { message: "Too many changes in a short time. Wait a moment and try again." };
  const patientId = z.uuid().safeParse(data.get("patientId"));
  const parsed = chartEntrySchema.safeParse({ tooth: text(data, "tooth"), code: text(data, "code"), surfaces: data.getAll("surfaces").map(String).join(""), note: text(data, "note"), occurredOn: text(data, "occurredOn") || undefined });
  if (!patientId.success) return { message: "That patient could not be found." };
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await addChartEntry({ ...clinic }, user.id, patientId.data, parsed.data);
  } catch (error) {
    if (error instanceof NotFoundError) return { message: "That patient could not be found." };
    throw error;
  }
  refresh();
  return { saved: `Tooth ${parsed.data.tooth} updated` };
}

export async function voidChartEntryAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "practitioner");
  if (!(await withinLimit(user.id))) return TOO_MANY;
  const parsed = chartVoidSchema.safeParse({ entryId: text(data, "entryId"), reason: text(data, "reason") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.reason?.[0] ?? "That change isn't allowed." };
  try {
    await voidChartEntry(clinic, user.id, parsed.data.entryId, parsed.data.reason);
  } catch (error) {
    if (error instanceof ChartEntryNotFoundError) return { message: "That entry is already gone." };
    throw error;
  }
  refresh();
  return {};
}

// ---- recall: a reminder list, never forced ----

export async function addRecallAction(_prev: DentalState, data: FormData): Promise<DentalState> {
  const { user, clinic } = await requireClinicRole("owner", "assistant", "practitioner");
  if (!(await withinLimit(user.id))) return TOO_MANY;
  const parsed = recallInputSchema.safeParse({ patientId: text(data, "patientId"), months: text(data, "months") || 6, reason: text(data, "reason") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await createRecall(clinic, user.id, parsed.data, clinicDateString(clinic.timezone));
  } catch (error) {
    if (error instanceof NotFoundError) return { fieldErrors: { patientId: ["That patient could not be found, or is archived."] } };
    throw error;
  }
  refresh();
  return { saved: "Recall added" };
}

export async function closeRecallAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant", "practitioner");
  if (!(await withinLimit(user.id))) return TOO_MANY;
  const parsed = z.object({ id: z.uuid(), outcome: z.enum(["completed", "cancelled"]) }).safeParse({ id: text(data, "id"), outcome: text(data, "outcome") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await closeRecall(clinic, user.id, parsed.data.id, parsed.data.outcome);
  } catch (error) {
    if (error instanceof RecallNotFoundError) return { message: "That recall is already closed." };
    throw error;
  }
  refresh();
  return {};
}

export async function sendRecallReminderAction(data: FormData): Promise<{ message?: string }> {
  const { user, clinic } = await requireClinicRole("owner", "assistant");
  const limit = await consumeRateLimit("recall-send", user.id, { max: 60, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many reminders in a short time. Wait a while." };
  const id = z.uuid().safeParse(text(data, "id"));
  if (!id.success) return { message: "That change isn't allowed." };
  try {
    const sent = await sendRecallReminder(clinic, user.id, id.data);
    if (!sent) return { message: "Couldn't send: the patient has no email on file, or the email failed." };
  } catch (error) {
    if (error instanceof RecallNotFoundError) return { message: "That recall is already closed." };
    throw error;
  }
  refresh();
  return {};
}
