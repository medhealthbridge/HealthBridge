import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex, unique, foreignKey } from "drizzle-orm/pg-core";
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
    createdByStaffId: uuid("created_by_staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicInvoiceNumberIdx: uniqueIndex("invoices_clinic_invoice_number_idx").on(table.clinicId, table.invoiceNumber),
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
    method: text("method").notNull(), // 'cash' | 'gcash' | 'maya' | 'card' | 'hmo'
    amountCents: integer("amount_cents").notNull(),
    referenceNumber: text("reference_number"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicInvoiceIdx: index("payments_clinic_invoice_idx").on(table.clinicId, table.invoiceId),
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
