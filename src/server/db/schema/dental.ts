import { pgTable, uuid, text, integer, boolean, date, timestamp, jsonb, index, unique, foreignKey } from "drizzle-orm/pg-core";
import { clinics } from "./tenancy";
import { clinicStaff } from "./staff";
import { patients } from "./patients";
import { appointments } from "./appointments";
import { services } from "./services";
import { invoices } from "./billing";

export const PLAN_STATUSES = ["draft", "proposed", "accepted", "in_progress", "completed", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_ITEM_STATUSES = ["planned", "done", "cancelled"] as const;
export type PlanItemStatus = (typeof PLAN_ITEM_STATUSES)[number];

/** A patient's treatment plan: phases of work with an estimate the patient can agree to and pay in steps. */
export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<PlanStatus>().notNull().default("draft"),
    phaseLabels: jsonb("phase_labels").$type<string[]>().notNull().default([]), // index 0 = phase 1
    notes: text("notes"),
    createdByStaffId: uuid("created_by_staff_id"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicPatientIdx: index("treatment_plans_clinic_patient_idx").on(table.clinicId, table.patientId),
    clinicIdIdUnique: unique("treatment_plans_clinic_id_id_unique").on(table.clinicId, table.id),
    treatmentPlansPatientFk: foreignKey({ name: "treatment_plans_patient_fk", columns: [table.clinicId, table.patientId], foreignColumns: [patients.clinicId, patients.id] }),
    treatmentPlansCreatedByFk: foreignKey({ name: "treatment_plans_created_by_fk", columns: [table.clinicId, table.createdByStaffId], foreignColumns: [clinicStaff.clinicId, clinicStaff.id] }),
  }),
);

export const treatmentPlanItems = pgTable(
  "treatment_plan_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    planId: uuid("plan_id").notNull(),
    phase: integer("phase").notNull().default(1),
    serviceId: uuid("service_id"),
    description: text("description").notNull(),
    tooth: integer("tooth"), // FDI, null for whole-mouth work (cleaning, whitening)
    surfaces: text("surfaces"), // e.g. "MOD"
    chartCode: text("chart_code"), // what to record on the tooth when this is done (filling, crown …); null = nothing to chart
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(), // snapshot at planning: later price-list changes don't move an agreed estimate
    vatExempt: boolean("vat_exempt").notNull().default(false),
    status: text("status").$type<PlanItemStatus>().notNull().default("planned"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneByStaffId: uuid("done_by_staff_id"),
    invoiceId: uuid("invoice_id"), // set once billed
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicPlanIdx: index("treatment_plan_items_clinic_plan_idx").on(table.clinicId, table.planId),
    itemsPlanFk: foreignKey({ name: "treatment_plan_items_plan_fk", columns: [table.clinicId, table.planId], foreignColumns: [treatmentPlans.clinicId, treatmentPlans.id] }),
    itemsServiceFk: foreignKey({ name: "treatment_plan_items_service_fk", columns: [table.clinicId, table.serviceId], foreignColumns: [services.clinicId, services.id] }),
    itemsInvoiceFk: foreignKey({ name: "treatment_plan_items_invoice_fk", columns: [table.clinicId, table.invoiceId], foreignColumns: [invoices.clinicId, invoices.id] }),
  }),
);

export const CHART_KINDS = ["condition", "procedure"] as const;

/**
 * What is true of a tooth, or was done to it. Never edited or deleted: a mistake is voided with a
 * reason, so the chart keeps its history. The tooth's current look is worked out from the live entries.
 */
export const dentalChartEntries = pgTable(
  "dental_chart_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull(),
    tooth: integer("tooth").notNull(), // FDI two-digit number
    surfaces: text("surfaces"), // subset of M D O I B F L P, e.g. "MO"
    kind: text("kind").notNull(), // 'condition' (a finding) | 'procedure' (work done)
    code: text("code").notNull(), // see src/lib/dental-chart.ts
    note: text("note"),
    occurredOn: date("occurred_on").notNull(),
    appointmentId: uuid("appointment_id"),
    planItemId: uuid("plan_item_id"),
    authorStaffId: uuid("author_staff_id"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicPatientIdx: index("dental_chart_entries_clinic_patient_idx").on(table.clinicId, table.patientId),
    chartPatientFk: foreignKey({ name: "dental_chart_entries_patient_fk", columns: [table.clinicId, table.patientId], foreignColumns: [patients.clinicId, patients.id] }),
    chartAppointmentFk: foreignKey({ name: "dental_chart_entries_appointment_fk", columns: [table.clinicId, table.appointmentId], foreignColumns: [appointments.clinicId, appointments.id] }),
    chartAuthorFk: foreignKey({ name: "dental_chart_entries_author_fk", columns: [table.clinicId, table.authorStaffId], foreignColumns: [clinicStaff.clinicId, clinicStaff.id] }),
  }),
);
