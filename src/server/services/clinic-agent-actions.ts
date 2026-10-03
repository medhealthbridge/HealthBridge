import { and, count, eq, gt, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/src/server/db/client";
import { agentActions } from "@/src/server/db/schema";
import { newPatientByAssistantSchema, patientChangesSchema } from "@/src/lib/schemas/clinic-assistant";
import { serviceInputSchema } from "@/src/lib/schemas/service";
import {
  bookAppointment,
  changeAppointmentStatus,
  clinicDateString,
  ConflictError,
  rescheduleAppointment,
  createPatient,
  dayBounds,
  NotFoundError,
  setPatientArchived,
  StaleChangeError,
  TransitionError,
  updatePatient,
  type StaffClinic,
} from "./clinic-app";
import { createService, DuplicateServiceError, ServiceNotFoundError, setServiceArchived, StaleServiceError, updateService } from "./price-list";
import { createItem, DuplicateSkuError, consumeStock, InsufficientStockError, ItemNotFoundError, receiveStock } from "./inventory";
import { ClaimClosedError, ClaimNotFoundError, createClaim, setClaimStatus, UnknownReceiptError } from "./claims";
import { itemInputSchema } from "@/src/lib/schemas/inventory";
import { claimInputSchema, CLAIM_STATUSES } from "@/src/lib/schemas/claim";
import { checkOwnPassword } from "./step-up";

export type ClinicActor = { id: string; clinic: StaffClinic };

export type Risk = "create" | "edit" | "delete";
export type StepUp = "none" | "unlock" | "password+typed";
/** What each kind of change demands before it runs: nothing, a recent password, or a fresh password plus typing the record's MRN. */
export const STEP_UP: Record<Risk, StepUp> = { create: "none", edit: "unlock", delete: "password+typed" };

const DAILY_LIMIT: Record<Risk, number> = { create: 60, edit: 40, delete: 5 };
const TTL_MINUTES = 10;

const ACTIONS = {
  create_patient: {
    risk: "create" as Risk,
    schema: newPatientByAssistantSchema,
    run: async (who: ClinicActor, args: z.infer<typeof newPatientByAssistantSchema>) => {
      const row = await createPatient(who.clinic.id, who.id, { ...args, oscaId: null, pwdId: null });
      return `Added ${args.firstName} ${args.lastName} as ${row.mrn}.`;
    },
  },
  update_patient: {
    risk: "edit" as Risk,
    schema: z.object({ patientId: z.uuid(), mrn: z.string(), changes: patientChangesSchema, before: z.record(z.string(), z.string().nullable()) }),
    run: async (who: ClinicActor, args: { patientId: string; mrn: string; changes: z.infer<typeof patientChangesSchema>; before: Record<string, string | null> }) => {
      await updatePatient(who.clinic.id, who.id, args.patientId, args.changes as Record<string, string | null>, args.before);
      return `Updated ${args.mrn}.`;
    },
  },
  archive_patient: {
    risk: "delete" as Risk,
    schema: z.object({ patientId: z.uuid(), mrn: z.string() }),
    run: async (who: ClinicActor, args: { patientId: string; mrn: string }) => {
      await setPatientArchived(who.clinic.id, who.id, args.patientId, true);
      return `${args.mrn} archived. It can be restored; nothing was erased.`;
    },
  },
  restore_patient: {
    risk: "edit" as Risk,
    schema: z.object({ patientId: z.uuid(), mrn: z.string() }),
    run: async (who: ClinicActor, args: { patientId: string; mrn: string }) => {
      await setPatientArchived(who.clinic.id, who.id, args.patientId, false);
      return `${args.mrn} restored.`;
    },
  },
  book_appointment: {
    risk: "create" as Risk,
    schema: z.object({ patientId: z.uuid(), startsAt: z.iso.datetime(), practitionerStaffId: z.uuid().nullable(), serviceId: z.uuid().nullable().default(null) }),
    run: async (who: ClinicActor, args: { patientId: string; startsAt: string; practitionerStaffId: string | null; serviceId: string | null }) => {
      await bookAppointment(who.clinic, who.id, { patientId: args.patientId, startsAt: new Date(args.startsAt), practitionerStaffId: args.practitionerStaffId, serviceId: args.serviceId });
      return "Appointment booked.";
    },
  },
  reschedule_appointment: {
    risk: "edit" as Risk,
    schema: z.object({ appointmentId: z.uuid(), startsAt: z.iso.datetime() }),
    run: async (who: ClinicActor, args: { appointmentId: string; startsAt: string }) => {
      await rescheduleAppointment(who.clinic, who.id, args.appointmentId, { startsAt: new Date(args.startsAt) });
      return "Appointment moved.";
    },
  },
  create_service: {
    risk: "create" as Risk,
    schema: serviceInputSchema,
    run: async (who: ClinicActor, args: z.output<typeof serviceInputSchema>) => {
      await createService(who.clinic.id, who.id, args);
      return `Added ${args.name} to the price list.`;
    },
  },
  update_service: {
    risk: "edit" as Risk,
    schema: z.object({ serviceId: z.uuid(), name: z.string(), changes: serviceInputSchema.partial(), before: z.record(z.string(), z.unknown()) }),
    run: async (who: ClinicActor, args: { serviceId: string; name: string; changes: Partial<z.output<typeof serviceInputSchema>>; before: Record<string, unknown> }) => {
      await updateService(who.clinic.id, who.id, args.serviceId, args.changes, args.before as Partial<z.output<typeof serviceInputSchema>>);
      return `Updated ${args.name}.`;
    },
  },
  archive_service: {
    risk: "delete" as Risk,
    schema: z.object({ serviceId: z.uuid(), phrase: z.string() }),
    run: async (who: ClinicActor, args: { serviceId: string; phrase: string }) => {
      await setServiceArchived(who.clinic.id, who.id, args.serviceId, true);
      return `${args.phrase} archived. It can be restored.`;
    },
  },
  restore_service: {
    risk: "edit" as Risk,
    schema: z.object({ serviceId: z.uuid(), name: z.string() }),
    run: async (who: ClinicActor, args: { serviceId: string; name: string }) => {
      await setServiceArchived(who.clinic.id, who.id, args.serviceId, false);
      return `${args.name} restored.`;
    },
  },
  create_item: {
    risk: "create" as Risk,
    schema: itemInputSchema,
    run: async (who: ClinicActor, args: z.output<typeof itemInputSchema>) => {
      await createItem(who.clinic.id, who.id, args);
      return `Added ${args.name} to inventory.`;
    },
  },
  receive_stock: {
    risk: "create" as Risk,
    schema: z.object({ itemId: z.uuid(), name: z.string(), quantity: z.number().int().min(1).max(100_000), lotNumber: z.string().nullable().default(null), expiresOn: z.iso.date().nullable().default(null) }),
    run: async (who: ClinicActor, args: { itemId: string; name: string; quantity: number; lotNumber: string | null; expiresOn: string | null }) => {
      await receiveStock(who.clinic.id, who.id, { itemId: args.itemId, quantity: args.quantity, lotNumber: args.lotNumber, expiresOn: args.expiresOn });
      return `Received ${args.quantity} of ${args.name}.`;
    },
  },
  use_stock: {
    risk: "edit" as Risk,
    schema: z.object({ itemId: z.uuid(), name: z.string(), quantity: z.number().int().min(1).max(100_000), reason: z.string().nullable().default(null) }),
    run: async (who: ClinicActor, args: { itemId: string; name: string; quantity: number; reason: string | null }) => {
      await consumeStock(who.clinic.id, who.id, clinicToday(who.clinic), { itemId: args.itemId, quantity: args.quantity, reason: args.reason });
      return `Recorded ${args.quantity} of ${args.name} used.`;
    },
  },
  file_claim: {
    risk: "create" as Risk,
    schema: claimInputSchema.extend({ patientName: z.string() }),
    run: async (who: ClinicActor, args: z.output<typeof claimInputSchema> & { patientName: string }) => {
      await createClaim(who.clinic.id, who.id, args);
      return `Filed a claim with ${args.payorName} for ${args.patientName}.`;
    },
  },
  set_claim_status: {
    risk: "edit" as Risk,
    schema: z.object({ claimId: z.uuid(), label: z.string(), to: z.enum(CLAIM_STATUSES).exclude(["withdrawn"]) }),
    run: async (who: ClinicActor, args: { claimId: string; label: string; to: (typeof CLAIM_STATUSES)[number] }) => {
      await setClaimStatus(who.clinic.id, who.id, args.claimId, args.to);
      return `${args.label} marked ${args.to}.`;
    },
  },
  change_appointment_status: {
    risk: "edit" as Risk,
    schema: z.object({ appointmentId: z.uuid(), to: z.enum(["confirmed", "cancelled", "no_show"]) }),
    run: async (who: ClinicActor, args: { appointmentId: string; to: "confirmed" | "cancelled" | "no_show" }) => {
      await changeAppointmentStatus(who.clinic.id, who.id, { appointmentId: args.appointmentId, to: args.to });
      return `Appointment marked ${args.to.replace("_", " ")}.`;
    },
  },
};

export type ClinicActionKind = keyof typeof ACTIONS;

export const riskOf = (kind: ClinicActionKind) => ACTIONS[kind].risk;

/** Stores a proposal for this clinic. Nothing runs; args are validated now and again at confirm. */
export async function createClinicPendingAction(who: ClinicActor, kind: ClinicActionKind, args: unknown, summary: string) {
  const parsed = ACTIONS[kind].schema.parse(args);
  const [row] = await db
    .insert(agentActions)
    .values({ userId: who.id, clinicId: who.clinic.id, kind, risk: ACTIONS[kind].risk, args: parsed, summary, expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000) })
    .returning({ id: agentActions.id });
  return { id: row.id, summary, stepUp: STEP_UP[ACTIONS[kind].risk] };
}

export type ConfirmInput = {
  password?: string;
  typed?: string;
  /** True when the request carries a still-valid unlock cookie. */
  unlocked: boolean;
};

export type ConfirmOutcome =
  | { ok: true; message: string; grantUnlock: boolean }
  | { ok: false; message: string; need?: "password" | "typed" };

const startOfToday = (clinic: StaffClinic) => dayBounds(clinic.timezone).start;
const clinicToday = (clinic: StaffClinic) => clinicDateString(clinic.timezone);

/**
 * Applies one of this clinic's proposals, if every check passes, in this order:
 * it is the caller's own, for this clinic, pending and unexpired; the step-up
 * its risk demands is met (password, and for deletes the record's MRN typed
 * out); today's limit for that risk isn't spent. Only then is it claimed
 * (pending → executed in one guarded update) and run, so a double-click or a
 * replay cannot apply it twice.
 */
export async function confirmClinicAction(who: ClinicActor, actionId: string, input: ConfirmInput): Promise<ConfirmOutcome> {
  const [action] = await db
    .select()
    .from(agentActions)
    .where(and(eq(agentActions.id, actionId), eq(agentActions.userId, who.id), eq(agentActions.clinicId, who.clinic.id), eq(agentActions.status, "pending"), gt(agentActions.expiresAt, new Date())))
    .limit(1);
  if (!action) return { ok: false, message: "That request expired or was already handled." };

  const kind = action.kind as ClinicActionKind;
  const spec = ACTIONS[kind];
  if (!spec) return { ok: false, message: "That request is no longer supported." };

  let grantUnlock = false;
  const stepUp = STEP_UP[spec.risk];
  if (stepUp === "password+typed") {
    // What must be typed back: a patient's MRN, or a service's name.
    const { mrn, phrase } = action.args as { mrn?: string; phrase?: string };
    const expected = (mrn ?? phrase ?? "").trim();
    if (!input.typed || input.typed.trim().toUpperCase() !== expected.toUpperCase()) return { ok: false, need: "typed", message: `Type ${expected} to confirm.` };
  }
  if (stepUp === "password+typed" || (stepUp === "unlock" && !input.unlocked)) {
    if (!input.password) return { ok: false, need: "password", message: "Enter your password to continue." };
    const check = await checkOwnPassword(who.id, input.password);
    if (check === "locked") return { ok: false, message: "Too many wrong passwords. Try again in 15 minutes." };
    if (check === "wrong") return { ok: false, need: "password", message: "That password is incorrect." };
    grantUnlock = stepUp === "unlock";
  }

  const [{ used }] = await db
    .select({ used: count() })
    .from(agentActions)
    .where(and(eq(agentActions.clinicId, who.clinic.id), eq(agentActions.risk, spec.risk), eq(agentActions.status, "executed"), gte(agentActions.decidedAt, startOfToday(who.clinic))));
  if (used >= DAILY_LIMIT[spec.risk]) return { ok: false, message: `Today's limit for this kind of change (${DAILY_LIMIT[spec.risk]}) is used up. Try again tomorrow.` };

  const [claimed] = await db
    .update(agentActions)
    .set({ status: "executed", decidedAt: new Date() })
    .where(and(eq(agentActions.id, actionId), eq(agentActions.status, "pending")))
    .returning({ id: agentActions.id });
  if (!claimed) return { ok: false, message: "That request was already handled." };

  try {
    const args = spec.schema.parse(action.args);
    const message = await (spec.run as (w: ClinicActor, a: unknown) => Promise<string>)(who, args);
    await db.update(agentActions).set({ result: message }).where(eq(agentActions.id, actionId));
    return { ok: true, message, grantUnlock };
  } catch (error) {
    const message =
      error instanceof StaleChangeError || error instanceof StaleServiceError ? "That record changed after the request was prepared. Ask again to see the current values."
      : error instanceof NotFoundError || error instanceof ServiceNotFoundError ? "That record no longer exists."
      : error instanceof DuplicateServiceError ? "A service with that name already exists."
      : error instanceof ItemNotFoundError ? "That inventory item no longer exists."
      : error instanceof InsufficientStockError ? `Only ${error.available} in date. Nothing was changed.`
      : error instanceof DuplicateSkuError ? "Another item already uses that SKU."
      : error instanceof ClaimNotFoundError || error instanceof ClaimClosedError ? "That claim can't be changed any more."
      : error instanceof UnknownReceiptError ? "No receipt with that number."
      : error instanceof ConflictError ? "That practitioner already has an appointment at that time."
      : error instanceof TransitionError ? "That appointment has already moved on."
      : "That change failed. Nothing was changed.";
    const expected = error instanceof ItemNotFoundError || error instanceof InsufficientStockError || error instanceof DuplicateSkuError || error instanceof ClaimNotFoundError || error instanceof ClaimClosedError || error instanceof UnknownReceiptError;
    if (!expected && !(error instanceof StaleChangeError || error instanceof StaleServiceError || error instanceof NotFoundError || error instanceof ServiceNotFoundError || error instanceof DuplicateServiceError || error instanceof ConflictError || error instanceof TransitionError)) {
      console.error(`[agent] clinic action ${kind} failed:`, error instanceof Error ? error.message : "unknown error");
    }
    await db.update(agentActions).set({ status: "failed", result: message }).where(eq(agentActions.id, actionId));
    return { ok: false, message };
  }
}

export async function cancelClinicAction(who: ClinicActor, actionId: string) {
  await db
    .update(agentActions)
    .set({ status: "cancelled", decidedAt: new Date() })
    .where(and(eq(agentActions.id, actionId), eq(agentActions.userId, who.id), eq(agentActions.clinicId, who.clinic.id), eq(agentActions.status, "pending")));
}
