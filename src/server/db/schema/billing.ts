import { pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex, unique, foreignKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinics } from "./tenancy";
import { clinicStaff } from "./staff";
import { patients } from "./patients";
import { appointments } from "./appointments";

/**
 * One official receipt per invoice. `invoiceNumber` is the BIR receipt
 * series and must never be reused or deleted — void via `status = 'void'`,
 * never a row delete (BIR sales-book requirement + non-negotiable #4). All
 * money columns are integer cents (non-negotiable #6).
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull(),
    appointmentId: uuid("appointment_id"),
    invoiceNumber: text("invoice_number").notNull(),
    discountType: text("discount_type").notNull().default("none"), // 'none' | 'senior_citizen' | 'pwd'
    discountIdNumber: text("discount_id_number"), // OSCA or PWD id recorded against the transaction
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    vatCents: integer("vat_cents").notNull().default(0),
    vatExemptCents: integer("vat_exempt_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    status: text("status").notNull().default("draft"), // 'draft' | 'paid' | 'void'
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    // What the receipt prints for the discount ("Senior citizen (20%)", "Employee discount"), and the rule behind it.
    discountLabel: text("discount_label"),
    discountKind: text("discount_kind"), // 'statutory' | 'percent' | 'fixed' | null
    discountValue: integer("discount_value"), // percent (1-100) or fixed centavos; null for statutory
    // Sum of this invoice's payments, kept in step inside the payment transaction. Balance = total - paid.
    paidCents: integer("paid_cents").notNull().default(0),
    // One per checkout dialog: a double tap or a network retry replays the same id and gets the first receipt back.
    requestId: uuid("request_id"),
    voidReason: text("void_reason"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdByStaffId: uuid("created_by_staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicInvoiceNumberIdx: uniqueIndex("invoices_clinic_invoice_number_idx").on(table.clinicId, table.invoiceNumber),
    clinicRequestIdx: uniqueIndex("invoices_clinic_request_idx").on(table.clinicId, table.requestId).where(sql`request_id is not null`),
    clinicPatientIdx: index("invoices_clinic_patient_idx").on(table.clinicId, table.patientId),
    clinicIssuedAtIdx: index("invoices_clinic_issued_at_idx").on(table.clinicId, table.issuedAt),
    clinicIdIdUnique: unique("invoices_clinic_id_id_unique").on(table.clinicId, table.id),
    invoicesPatientFk: foreignKey({
      name: "invoices_patient_fk",
      columns: [table.clinicId, table.patientId],
      foreignColumns: [patients.clinicId, patients.id],
    }),
    invoicesAppointmentFk: foreignKey({
      name: "invoices_appointment_fk",
      columns: [table.clinicId, table.appointmentId],
      foreignColumns: [appointments.clinicId, appointments.id],
    }),
    invoicesCreatedByFk: foreignKey({
      name: "invoices_created_by_fk",
      columns: [table.clinicId, table.createdByStaffId],
      foreignColumns: [clinicStaff.clinicId, clinicStaff.id],
    }),
  }),
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    invoiceId: uuid("invoice_id").notNull(),
    description: text("description").notNull(),
    serviceCode: text("service_code"),
    tooth: text("tooth"), // FDI number when the line is for a tooth
    planItemId: uuid("plan_item_id"),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => ({
    clinicInvoiceIdx: index("invoice_line_items_clinic_invoice_idx").on(table.clinicId, table.invoiceId),
    invoiceLineItemsInvoiceFk: foreignKey({
      name: "invoice_line_items_invoice_fk",
      columns: [table.clinicId, table.invoiceId],
      foreignColumns: [invoices.clinicId, invoices.id],
    }),
  }),
);

/** Cash, GCash, Maya, card and HMO all settle through this table. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    invoiceId: uuid("invoice_id").notNull(),
    receiptNumber: text("receipt_number"), // PR-000001: one per payment, in the order taken
    method: text("method").notNull(), // 'cash' | 'gcash' | 'maya' | 'card' | 'hmo'
    amountCents: integer("amount_cents").notNull(),
    referenceNumber: text("reference_number"),
    requestId: uuid("request_id"), // same idea as invoices.request_id, for later payments
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicInvoiceIdx: index("payments_clinic_invoice_idx").on(table.clinicId, table.invoiceId),
    clinicReceiptIdx: uniqueIndex("payments_clinic_receipt_idx").on(table.clinicId, table.receiptNumber),
    clinicRequestIdx: uniqueIndex("payments_clinic_request_idx").on(table.clinicId, table.requestId).where(sql`request_id is not null`),
    paymentsInvoiceFk: foreignKey({
      name: "payments_invoice_fk",
      columns: [table.clinicId, table.invoiceId],
      foreignColumns: [invoices.clinicId, invoices.id],
    }),
  }),
);

/** PhilHealth case-rate claims and HMO LOA/receivables, tracked to payment. */
export const hmoClaims = pgTable(
  "hmo_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull(),
    invoiceId: uuid("invoice_id"),
    payorType: text("payor_type").notNull(), // 'hmo' | 'philhealth'
    payorName: text("payor_name").notNull(),
    memberOrPolicyNumber: text("member_or_policy_number"),
    loaNumber: text("loa_number"),
    claimAmountCents: integer("claim_amount_cents").notNull(),
    status: text("status").notNull().default("filed"), // 'filed' | 'pending' | 'approved' | 'denied' | 'resubmitted' | 'paid'
    filedAt: timestamp("filed_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicStatusIdx: index("hmo_claims_clinic_status_idx").on(table.clinicId, table.status),
    clinicPatientIdx: index("hmo_claims_clinic_patient_idx").on(table.clinicId, table.patientId),
    hmoClaimsPatientFk: foreignKey({
      name: "hmo_claims_patient_fk",
      columns: [table.clinicId, table.patientId],
      foreignColumns: [patients.clinicId, patients.id],
    }),
    hmoClaimsInvoiceFk: foreignKey({
      name: "hmo_claims_invoice_fk",
      columns: [table.clinicId, table.invoiceId],
      foreignColumns: [invoices.clinicId, invoices.id],
    }),
  }),
);

/** Equal parts of an invoice's balance, due monthly (braces, dentures, long treatments). Which are paid is worked out from `invoices.paid_cents`. */
export const invoiceInstallments = pgTable(
  "invoice_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    invoiceId: uuid("invoice_id").notNull(),
    sequence: integer("sequence").notNull(),
    dueOn: date("due_on").notNull(),
    amountCents: integer("amount_cents").notNull(),
  },
  (table) => ({
    clinicInvoiceIdx: index("invoice_installments_clinic_invoice_idx").on(table.clinicId, table.invoiceId),
    clinicDueIdx: index("invoice_installments_clinic_due_idx").on(table.clinicId, table.dueOn),
    invoiceInstallmentsInvoiceFk: foreignKey({
      name: "invoice_installments_invoice_fk",
      columns: [table.clinicId, table.invoiceId],
      foreignColumns: [invoices.clinicId, invoices.id],
    }),
  }),
);

/**
 * A discount the owner has set up, with its own description: "Employee 10%", "Promo ₱500 off".
 * Senior citizen and PWD are not rows: they are built in, because the law (RA 9994, RA 10754)
 * decides how they work (VAT-exempt first, then 20%).
 */
export const discountTypes = pgTable(
  "discount_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull(), // 'percent' | 'fixed'
    value: integer("value").notNull(), // percent 1-100, or centavos
    requiresId: boolean("requires_id").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicNameIdx: uniqueIndex("discount_types_clinic_name_idx").on(table.clinicId, sql`lower(${table.name})`).where(sql`archived_at is null`),
  }),
);
