import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { auditLogs, invoiceLineItems, invoices, patients, payments, services } from "@/src/server/db/schema";
import { invoiceTotals, type DiscountType } from "@/src/lib/invoice-totals";
import type { CheckoutInput } from "@/src/lib/schemas/invoice";
import type { StaffClinic } from "./clinic-app";
import { NotFoundError } from "./clinic-app";

export class InvoiceNotFoundError extends Error {}
export class InvoiceAlreadyVoidError extends Error {}
export class InvalidServiceError extends Error {}

type Actor = Pick<StaffClinic, "id" | "staffId">;

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  patientName: string;
  patientMrn: string;
  totalCents: number;
  status: string;
  issuedAt: Date | null;
  method: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  patientId: string;
  discountType: DiscountType;
  discountIdNumber: string | null;
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  vatExemptCents: number;
  voidReason: string | null;
  voidedAt: Date | null;
  lines: { description: string; serviceCode: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  payments: { method: string; amountCents: number; referenceNumber: string | null; paidAt: Date }[];
};

/** OR-000001, per clinic, in the order issued. Counted inside the checkout transaction under a lock so two desks never get the same number. */
export const receiptNumber = (sequence: number) => `OR-${String(sequence).padStart(6, "0")}`;

export async function checkout(clinic: Actor, actorUserId: string, input: CheckoutInput) {
  return withTenant(clinic.id, async (tx) => {
    const [patient] = await tx
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.id, input.patientId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) throw new NotFoundError("patient");

    const ids = [...new Set(input.lines.map((line) => line.serviceId))];
    const found = await tx
      .select()
      .from(services)
      .where(and(eq(services.clinicId, clinic.id), inArray(services.id, ids), isNull(services.deletedAt)));
    const byId = new Map(found.map((service) => [service.id, service]));
    if (ids.some((id) => !byId.has(id))) throw new InvalidServiceError();

    const lines = input.lines.map((line) => {
      const service = byId.get(line.serviceId)!;
      return { service, quantity: line.quantity, unitPriceCents: service.priceCentavos, vatExempt: service.vatExempt };
    });
    const totals = invoiceTotals(lines, input.discountType);

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"invoice:" + clinic.id}))`);
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(invoices).where(eq(invoices.clinicId, clinic.id));
    const number = receiptNumber(count + 1);
    const now = new Date();

    const [invoice] = await tx
      .insert(invoices)
      .values({
        clinicId: clinic.id,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        invoiceNumber: number,
        discountType: input.discountType,
        discountIdNumber: input.discountType === "none" ? null : input.discountIdNumber,
        ...totals,
        status: "paid",
        issuedAt: now,
        createdByStaffId: clinic.staffId,
      })
      .returning({ id: invoices.id });
    await tx.insert(invoiceLineItems).values(
      lines.map((line) => ({
        clinicId: clinic.id,
        invoiceId: invoice.id,
        description: line.service.name,
        serviceCode: line.service.code,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.unitPriceCents * line.quantity,
      })),
    );
    await tx.insert(payments).values({
      clinicId: clinic.id,
      invoiceId: invoice.id,
      method: input.method,
      amountCents: totals.totalCents,
      referenceNumber: input.referenceNumber || null,
      paidAt: now,
    });
    await tx.insert(auditLogs).values({
      clinicId: clinic.id,
      actorUserId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "create",
      diff: { after: { number, patientId: input.patientId, totalCents: totals.totalCents, method: input.method, discountType: input.discountType } },
    });
    return { id: invoice.id, invoiceNumber: number, totalCents: totals.totalCents };
  });
}

const summaryColumns = {
  id: invoices.id,
  invoiceNumber: invoices.invoiceNumber,
  totalCents: invoices.totalCents,
  status: invoices.status,
  issuedAt: invoices.issuedAt,
  firstName: patients.firstName,
  lastName: patients.lastName,
  displayName: patients.displayName,
  patientMrn: patients.medicalRecordNumber,
};

const patientName = (row: { firstName: string | null; lastName: string | null; displayName: string | null }) =>
  row.displayName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed patient";

/** Recent receipts, newest first, voided ones included and marked. */
export async function listInvoices(clinicId: string, { patientId, limit = 100 }: { patientId?: string; limit?: number } = {}): Promise<InvoiceSummary[]> {
  return withTenant(clinicId, async (tx) => {
    const rows = await tx
      .select({ ...summaryColumns, method: sql<string | null>`(select p.method from payments p where p.clinic_id = ${invoices.clinicId} and p.invoice_id = ${invoices.id} order by p.paid_at limit 1)` })
      .from(invoices)
      .innerJoin(patients, and(eq(patients.clinicId, invoices.clinicId), eq(patients.id, invoices.patientId)))
      .where(and(eq(invoices.clinicId, clinicId), patientId ? eq(invoices.patientId, patientId) : undefined))
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
    return rows.map(({ firstName, lastName, displayName, ...row }) => ({ ...row, patientName: patientName({ firstName, lastName, displayName }) }));
  });
}

export async function findInvoice(clinicId: string, invoiceNumber: string): Promise<InvoiceDetail | null> {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({
        ...summaryColumns,
        patientId: invoices.patientId,
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
    const [lines, paid] = await Promise.all([
      tx.select().from(invoiceLineItems).where(and(eq(invoiceLineItems.clinicId, clinicId), eq(invoiceLineItems.invoiceId, row.id))),
      tx.select().from(payments).where(and(eq(payments.clinicId, clinicId), eq(payments.invoiceId, row.id))).orderBy(payments.paidAt),
    ]);
    const { firstName, lastName, displayName, ...rest } = row;
    return {
      ...rest,
      patientName: patientName({ firstName, lastName, displayName }),
      discountType: row.discountType as DiscountType,
      method: paid[0]?.method ?? null,
      lines: lines.map((line) => ({ description: line.description, serviceCode: line.serviceCode, quantity: line.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.lineTotalCents })),
      payments: paid.map((payment) => ({ method: payment.method, amountCents: payment.amountCents, referenceNumber: payment.referenceNumber, paidAt: payment.paidAt })),
    };
  });
}

/** The delete: the receipt number stays in the books, marked void with who and why. Owner only (the action enforces it). */
export async function voidInvoice(clinic: Actor, actorUserId: string, invoiceId: string, reason: string) {
  await withTenant(clinic.id, async (tx) => {
    const [invoice] = await tx
      .select({ id: invoices.id, status: invoices.status, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)))
      .for("update")
      .limit(1);
    if (!invoice) throw new InvoiceNotFoundError();
    if (invoice.status === "void") throw new InvoiceAlreadyVoidError();
    await tx.update(invoices).set({ status: "void", voidReason: reason, voidedAt: new Date() }).where(and(eq(invoices.clinicId, clinic.id), eq(invoices.id, invoiceId)));
    await tx.insert(auditLogs).values({
      clinicId: clinic.id,
      actorUserId,
      entityType: "invoice",
      entityId: invoiceId,
      action: "delete",
      diff: { before: { status: invoice.status }, after: { status: "void", reason, number: invoice.invoiceNumber } },
    });
  });
}
