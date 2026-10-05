import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import {
  auditLogs, discountTypes, invoiceInstallments, invoiceLineItems, invoices, patients, payments, recalls, services, treatmentPlanItems, treatmentPlans,
} from "@/src/server/db/schema";
import { describeDiscount, parseDiscountAmount, ruleFrom } from "@/src/lib/discounts";
import { buildInstallments, installmentStatuses, nextInstallmentDue, addMonths, type InstallmentStatus } from "@/src/lib/installments";
import { invoiceTotalsFor, STATUTORY_LABELS, type DiscountRule } from "@/src/lib/invoice-totals";
import type { CheckoutInput, PaymentMethod } from "@/src/lib/schemas/invoice";
import { clinicDateString, NotFoundError, type StaffClinic } from "./clinic-app";

export class InvoiceNotFoundError extends Error {}
export class InvoiceAlreadyVoidError extends Error {}
export class InvalidServiceError extends Error {}
export class InvalidDiscountError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}
export class InvalidPaymentError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

type Actor = Pick<StaffClinic, "id" | "staffId" | "role"> & { timezone?: string };
type Tx = Parameters<Parameters<typeof withTenant>[1]>[0];

export type InvoiceStatus = "paid" | "open" | "void" | "draft";

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientMrn: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  status: string;
  issuedAt: Date | null;
  method: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  patientId: string;
  discountLabel: string | null;
  discountIdNumber: string | null;
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  vatExemptCents: number;
  voidReason: string | null;
  voidedAt: Date | null;
  lines: { description: string; serviceCode: string | null; tooth: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  payments: { receiptNumber: string | null; method: string; amountCents: number; referenceNumber: string | null; paidAt: Date }[];
  installments: InstallmentStatus[];
  nextDue: { dueOn: string; amountCents: number; overdue: boolean } | null;
};

/** OR-000001, per clinic, in the order issued. Counted inside the checkout transaction under a lock so two desks never get the same number. */
export const receiptNumber = (sequence: number) => `OR-${String(sequence).padStart(6, "0")}`;
/** PR-000001: one per payment taken (a deposit and each later payment get their own). */
export const paymentNumber = (sequence: number) => `PR-${String(sequence).padStart(6, "0")}`;

async function nextNumber(tx: Tx, clinicId: string, kind: "invoice" | "payment") {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${kind}:${clinicId}`}))`);
  const table = kind === "invoice" ? invoices : payments;
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(table).where(eq(table.clinicId, clinicId));
  return kind === "invoice" ? receiptNumber(count + 1) : paymentNumber(count + 1);
}

const patientName = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed patient";

/** Which discount applies, from what the cashier chose. Only the owner may make up a one-off discount. */
async function resolveDiscount(tx: Tx, clinic: Actor, input: CheckoutInput["discount"]): Promise<{ rule: DiscountRule; idNumber: string | null; kind: string | null; value: number | null; label: string | null }> {
  if (input.type === "none") return { rule: { kind: "none" }, idNumber: null, kind: null, value: null, label: null };
  if (input.type === "senior_citizen" || input.type === "pwd") {
    const label = STATUTORY_LABELS[input.type];
    return { rule: { kind: "statutory", label }, idNumber: input.idNumber, kind: "statutory", value: null, label };
  }
  if (input.type === "saved") {
    const [row] = await tx.select().from(discountTypes).where(and(eq(discountTypes.clinicId, clinic.id), eq(discountTypes.id, input.savedId!), isNull(discountTypes.archivedAt))).limit(1);
    if (!row) throw new InvalidDiscountError("That discount is no longer available.");
    if (row.requiresId && input.idNumber.length < 4) throw new InvalidDiscountError(`${row.name} needs an ID number.`);
    const kind = row.kind as "percent" | "fixed";
    const rule: DiscountRule = kind === "percent" ? { kind: "percent", percent: row.value, label: row.name } : { kind: "fixed", cents: row.value, label: row.name };
    return { rule, idNumber: row.requiresId ? input.idNumber : null, kind, value: row.value, label: row.name };
  }
  // custom: a one-off written by the owner
  if (clinic.role !== "owner") throw new InvalidDiscountError("Only the owner can give a one-off discount. Pick a saved discount, or ask the owner.");
  const parsed = parseDiscountAmount(input.customKind, input.customValue);
  if ("error" in parsed) throw new InvalidDiscountError(parsed.error);
  const rule: DiscountRule = input.customKind === "percent" ? { kind: "percent", percent: parsed.value, label: input.label } : { kind: "fixed", cents: parsed.value, label: input.label };
  return { rule, idNumber: input.idNumber || null, kind: input.customKind, value: parsed.value, label: input.label };
}

export async function checkout(clinic: Actor, actorUserId: string, input: CheckoutInput) {
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.id, input.patientId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw new NotFoundError("patient");

    // Lines from the price list (prices re-read here) and from this patient's treatment plan (the agreed estimate).
    const ids = [...new Set(input.lines.map((line) => line.serviceId))];
    const found = ids.length ? await tx.select().from(services).where(and(eq(services.clinicId, clinic.id), inArray(services.id, ids), isNull(services.deletedAt))) : [];
    const byId = new Map(found.map((service) => [service.id, service]));
    if (ids.some((id) => !byId.has(id))) throw new InvalidServiceError();

    const planRows = input.planItemIds.length
      ? await tx
          .select({ item: treatmentPlanItems })
          .from(treatmentPlanItems)
          .innerJoin(treatmentPlans, and(eq(treatmentPlans.clinicId, treatmentPlanItems.clinicId), eq(treatmentPlans.id, treatmentPlanItems.planId)))
          .where(and(eq(treatmentPlanItems.clinicId, clinic.id), inArray(treatmentPlanItems.id, input.planItemIds), eq(treatmentPlans.patientId, input.patientId), isNull(treatmentPlanItems.invoiceId), ne(treatmentPlanItems.status, "cancelled"), ne(treatmentPlans.status, "cancelled")))
          .for("update")
      : [];
    if (planRows.length !== new Set(input.planItemIds).size) throw new InvalidServiceError();

    const lines = [
      ...input.lines.map((line) => {
        const service = byId.get(line.serviceId)!;
        return { description: service.name, serviceCode: service.code, tooth: null as string | null, planItemId: null as string | null, quantity: line.quantity, unitPriceCents: service.priceCentavos, vatExempt: service.vatExempt };
      }),
      ...planRows.map(({ item }) => ({
        description: item.surfaces ? `${item.description} (${item.surfaces})` : item.description,
        serviceCode: null as string | null,
        tooth: item.tooth ? String(item.tooth) : null,
        planItemId: item.id,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        vatExempt: item.vatExempt,
      })),
    ];

    const discount = await resolveDiscount(tx, clinic, input.discount);
    const totals = invoiceTotalsFor(lines, discount.rule);

    const payNow = input.payNow === null ? totals.totalCents : input.payNow;
    if (payNow > totals.totalCents) throw new InvalidPaymentError("The amount paid is more than the bill.");
    const balance = totals.totalCents - payNow;
    if (input.installmentCount > 0 && balance === 0) throw new InvalidPaymentError("There is no balance to spread into installments.");
    const today = clinicDateString(clinic.timezone ?? "Asia/Manila");
    if (input.installmentCount > 0 && input.firstDueOn! < today) throw new InvalidPaymentError("The first installment can't be due in the past.");

    const number = await nextNumber(tx, clinic.id, "invoice");
    const now = new Date();
    const [invoice] = await tx
      .insert(invoices)
      .values({
        clinicId: clinic.id,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        invoiceNumber: number,
        discountType: discount.kind === null ? "none" : discount.kind === "statutory" ? (input.discount.type === "pwd" ? "pwd" : "senior_citizen") : "custom",
        discountLabel: discount.label,
        discountKind: discount.kind,
        discountValue: discount.value,
        discountIdNumber: discount.idNumber,
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        vatCents: totals.vatCents,
        vatExemptCents: totals.vatExemptCents,
        totalCents: totals.totalCents,
        paidCents: payNow,
        status: balance === 0 ? "paid" : "open",
        issuedAt: now,
        createdByStaffId: clinic.staffId,
      })
      .returning({ id: invoices.id });

    // One line each. (Line totals are the gross; the invoice carries the discount.)
    if (lines.length > 0) {
      await tx.insert(invoiceLineItems).values(
        lines.map((line) => ({
          clinicId: clinic.id, invoiceId: invoice.id, description: line.description, serviceCode: line.serviceCode, tooth: line.tooth, planItemId: line.planItemId,
          quantity: line.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.unitPriceCents * line.quantity,
        })),
      );
    }
    let paymentReceipt: string | null = null;
    if (payNow > 0) {
      paymentReceipt = await nextNumber(tx, clinic.id, "payment");
      await tx.insert(payments).values({ clinicId: clinic.id, invoiceId: invoice.id, receiptNumber: paymentReceipt, method: input.method!, amountCents: payNow, referenceNumber: input.referenceNumber || null, paidAt: now });
    }
    if (input.installmentCount > 0) {
      await tx.insert(invoiceInstallments).values(buildInstallments(balance, input.installmentCount, input.firstDueOn!).map((part) => ({ clinicId: clinic.id, invoiceId: invoice.id, ...part })));
    }
    if (planRows.length > 0) {
      await tx.update(treatmentPlanItems).set({ invoiceId: invoice.id }).where(and(eq(treatmentPlanItems.clinicId, clinic.id), inArray(treatmentPlanItems.id, planRows.map(({ item }) => item.id))));
    }
    // Optional: remind them to come back. Never forced, never books anything.
    if (input.recallMonths > 0) {
      await tx.insert(recalls).values({ clinicId: clinic.id, patientId: input.patientId, recallType: "dental_recall", dueDate: addMonths(today, input.recallMonths), notes: input.recallReason || null });
    }
    await tx.insert(auditLogs).values({
      clinicId: clinic.id, actorUserId, entityType: "invoice", entityId: invoice.id, action: "create",
      diff: { after: { number, patientId: input.patientId, totalCents: totals.totalCents, paidCents: payNow, balanceCents: balance, method: input.method ?? null, discount: discount.label, installments: input.installmentCount || null } },
    });
    return { id: invoice.id, invoiceNumber: number, totalCents: totals.totalCents, paidCents: payNow, balanceCents: balance, paymentReceipt };
  });
}

/** A later payment on an open invoice (a deposit's balance, an installment). Exactly the balance is the most it can take. */
export async function recordPayment(clinic: Actor, actorUserId: string, invoiceId: string, input: { amountCents: number; method: PaymentMethod; referenceNumber: string }) {
  return withTenant(clinic.id, async (tx) => {
    const [invoice] = await tx
      .select({ id: invoices.id, status: invoices.status, totalCents: invoices.totalCents, paidCents: invoices.paidCents, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)))
      .for("update")
      .limit(1);
    if (!invoice) throw new InvoiceNotFoundError();
    if (invoice.status === "void") throw new InvoiceAlreadyVoidError();
    const balance = invoice.totalCents - invoice.paidCents;
    if (invoice.status !== "open" || balance <= 0) throw new InvalidPaymentError("This receipt has no balance.");
    if (input.amountCents > balance) throw new InvalidPaymentError("That is more than the balance left.");
    const receipt = await nextNumber(tx, clinic.id, "payment");
    await tx.insert(payments).values({ clinicId: clinic.id, invoiceId, receiptNumber: receipt, method: input.method, amountCents: input.amountCents, referenceNumber: input.referenceNumber || null });
    const paid = invoice.paidCents + input.amountCents;
    await tx.update(invoices).set({ paidCents: paid, status: paid >= invoice.totalCents ? "paid" : "open" }).where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "invoice", entityId: invoiceId, action: "update", diff: { payment: { receipt, amountCents: input.amountCents, method: input.method }, balanceCents: invoice.totalCents - paid } });
    return { receipt, balanceCents: invoice.totalCents - paid };
  });
}

const summaryColumns = {
  id: invoices.id,
  invoiceNumber: invoices.invoiceNumber,
  totalCents: invoices.totalCents,
  paidCents: invoices.paidCents,
  status: invoices.status,
  issuedAt: invoices.issuedAt,
  firstName: patients.firstName,
  lastName: patients.lastName,
  displayName: patients.displayName,
  patientMrn: patients.medicalRecordNumber,
};

function summarize<T extends { firstName: string | null; lastName: string | null; displayName: string | null; totalCents: number; paidCents: number; status: string }>(row: T) {
  const { firstName, lastName, displayName, ...rest } = row;
  return { ...rest, patientName: patientName({ firstName, lastName, displayName }), balanceCents: row.status === "void" ? 0 : row.totalCents - row.paidCents };
}

/** Recent receipts, newest first, voided ones included and marked. `openOnly` lists only those still owing money. */
export async function listInvoices(clinicId: string, { patientId, limit = 100, openOnly = false }: { patientId?: string; limit?: number; openOnly?: boolean } = {}): Promise<InvoiceSummary[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ ...summaryColumns, method: sql<string | null>`(select p.method from payments p where p.clinic_id = ${invoices.clinicId} and p.invoice_id = ${invoices.id} order by p.paid_at limit 1)` })
      .from(invoices)
      .innerJoin(patients, and(eq(patients.clinicId, invoices.clinicId), eq(patients.id, invoices.patientId)))
      .where(and(eq(invoices.clinicId, clinicId), patientId ? eq(invoices.patientId, patientId) : undefined, openOnly ? eq(invoices.status, "open") : undefined))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
    return rows.map(summarize);
  });
}

/** Total still owed across open receipts, and how much of it is past an installment's due date. */
export async function receivablesSummary(clinicId: string, timezone: string) {
  const today = clinicDateString(timezone);
  return withTenant(clinicId, async (tx) => {
    const [owed] = await tx
      .select({ total: sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.paidCents}), 0)::int`, count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(and(eq(invoices.clinicId, clinicId), eq(invoices.status, "open")));
    const overdue = await tx
      .select({ invoiceId: invoiceInstallments.invoiceId })
      .from(invoiceInstallments)
      .innerJoin(invoices, and(eq(invoices.clinicId, invoiceInstallments.clinicId), eq(invoices.id, invoiceInstallments.invoiceId)))
      .where(and(eq(invoiceInstallments.clinicId, clinicId), eq(invoices.status, "open"), sql`${invoiceInstallments.dueOn} < ${today}`))
      .groupBy(invoiceInstallments.invoiceId);
    return { owedCents: owed?.total ?? 0, openCount: owed?.count ?? 0, overdueCount: overdue.length };
  });
}

export async function findInvoice(clinicId: string, invoiceNumber: string, timezone = "Asia/Manila"): Promise<InvoiceDetail | null> {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({
        ...summaryColumns,
        patientId: invoices.patientId,
        discountLabel: invoices.discountLabel,
        discountType: invoices.discountType,
        discountIdNumber: invoices.discountIdNumber,
        subtotalCents: invoices.subtotalCents,
        discountCents: invoices.discountCents,
        vatCents: invoices.vatCents,
        vatExemptCents: invoices.vatExemptCents,
        voidReason: invoices.voidReason,
        voidedAt: invoices.voidedAt,
      })
      .from(invoices)
      .innerJoin(patients, and(eq(patients.clinicId, invoices.clinicId), eq(patients.id, invoices.patientId)))
      .where(and(eq(invoices.clinicId, clinicId), eq(invoices.invoiceNumber, invoiceNumber)))
      .limit(1);
    if (!row) return null;
    const [lines, paid, installments] = await Promise.all([
      tx.select().from(invoiceLineItems).where(and(eq(invoiceLineItems.clinicId, clinicId), eq(invoiceLineItems.invoiceId, row.id))),
      tx.select().from(payments).where(and(eq(payments.clinicId, clinicId), eq(payments.invoiceId, row.id))).orderBy(payments.paidAt, payments.createdAt),
      tx.select().from(invoiceInstallments).where(and(eq(invoiceInstallments.clinicId, clinicId), eq(invoiceInstallments.invoiceId, row.id))).orderBy(invoiceInstallments.sequence),
    ]);
    const statuses = installmentStatuses(installments.map((item) => ({ sequence: item.sequence, dueOn: item.dueOn, amountCents: item.amountCents })), row.totalCents, row.paidCents, clinicDateString(timezone));
    const { discountType, ...base } = row;
    const legacyLabel = discountType === "senior_citizen" ? STATUTORY_LABELS.senior_citizen : discountType === "pwd" ? STATUTORY_LABELS.pwd : null;
    return {
      ...summarize(base),
      patientId: row.patientId,
      discountLabel: row.discountLabel ?? legacyLabel,
      discountIdNumber: row.discountIdNumber,
      subtotalCents: row.subtotalCents,
      discountCents: row.discountCents,
      vatCents: row.vatCents,
      vatExemptCents: row.vatExemptCents,
      voidReason: row.voidReason,
      voidedAt: row.voidedAt,
      method: paid[0]?.method ?? null,
      lines: lines.map((line) => ({ description: line.description, serviceCode: line.serviceCode, tooth: line.tooth, quantity: line.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.lineTotalCents })),
      payments: paid.map((payment) => ({ receiptNumber: payment.receiptNumber, method: payment.method, amountCents: payment.amountCents, referenceNumber: payment.referenceNumber, paidAt: payment.paidAt })),
      installments: statuses,
      nextDue: row.status === "open" ? nextInstallmentDue(statuses) : null,
    };
  });
}

/** The delete: the receipt number stays in the books, marked void with who and why. Owner only (the action enforces it). Plan items billed on it become billable again. */
export async function voidInvoice(clinic: Actor, actorUserId: string, invoiceId: string, reason: string) {
  await withTenant(clinic.id, async (tx) => {
    const [invoice] = await tx
      .select({ id: invoices.id, status: invoices.status, invoiceNumber: invoices.invoiceNumber, paidCents: invoices.paidCents })
      .from(invoices)
      .where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)))
      .for("update")
      .limit(1);
    if (!invoice) throw new InvoiceNotFoundError();
    if (invoice.status === "void") throw new InvoiceAlreadyVoidError();
    await tx.update(invoices).set({ status: "void", voidReason: reason, voidedAt: new Date() }).where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)));
    await tx.update(treatmentPlanItems).set({ invoiceId: null }).where(and(eq(treatmentPlanItems.clinicId, clinic.id), eq(treatmentPlanItems.invoiceId, invoiceId)));
    await tx.insert(auditLogs).values({
      clinicId: clinic.id, actorUserId, entityType: "invoice", entityId: invoiceId, action: "delete",
      diff: { before: { status: invoice.status, paidCents: invoice.paidCents }, after: { status: "void", reason, number: invoice.invoiceNumber } },
    });
  });
}

export { describeDiscount, ruleFrom };
