import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinics } from "./tenancy";
import { clinicStaff } from "./staff";
import { user } from "./auth";
import { appointments } from "./appointments";

/**
 * Core patient record. `patientKind` covers vet clinics, where the
 * "patient" is an animal and `guardianOrOwnerName`/`speciesBreed` apply
 * instead of the person fields. Specialty clinical detail (odontogram,
 * refraction, vaccine card) lives in `clinicalNotes.data`, not as bespoke
 * columns here — those fields vary per specialty and evolve; see
 * db-schema-architect skill's "extract on second use" note.
 *
 * Never hard-deleted (non-negotiable #4) — `deletedAt` only.
 * `dataPrivacyConsentAt` is the RA 10173 consent captured at intake.
 */
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    medicalRecordNumber: text("medical_record_number").notNull(),
    patientKind: text("patient_kind").notNull().default("human"), // 'human' | 'animal'
    firstName: text("first_name"),
    lastName: text("last_name"),
    displayName: text("display_name"), // pet name, or preferred display for a human patient
    dateOfBirth: date("date_of_birth"),
    sex: text("sex"),
    speciesBreed: text("species_breed"), // vet only
    guardianOrOwnerName: text("guardian_or_owner_name"), // parent (minor) or pet owner (vet)
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    address: text("address"),
    oscaId: text("osca_id"), // RA 9994 senior-citizen discount
    pwdId: text("pwd_id"), // RA 10754 PWD discount
    philhealthMemberPin: text("philhealth_member_pin"),
    dataPrivacyConsentAt: timestamp("data_privacy_consent_at", { withTimezone: true }),
    portalUserId: text("portal_user_id").references(() => user.id), // patient-app login, optional
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicIdx: index("patients_clinic_id_idx").on(table.clinicId),
    clinicNameIdx: index("patients_clinic_name_idx").on(table.clinicId, table.lastName, table.firstName),
    clinicMrnActiveIdx: uniqueIndex("patients_clinic_mrn_active_idx")
      .on(table.clinicId, table.medicalRecordNumber)
      .where(sql`deleted_at is null`),
    portalUserIdx: uniqueIndex("patients_portal_user_id_idx")
      .on(table.portalUserId)
      .where(sql`portal_user_id is not null`),
  }),
);

/** X-ray / lab / photo attachments on a patient's chart. */
export const patientAttachments = pgTable(
  "patient_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    uploadedByStaffId: uuid("uploaded_by_staff_id").references(() => clinicStaff.id),
    fileType: text("file_type").notNull(), // 'xray' | 'lab' | 'photo' | 'document'
    label: text("label"),
    fileUrl: text("file_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicPatientIdx: index("patient_attachments_clinic_patient_idx").on(table.clinicId, table.patientId),
  }),
);

/**
 * Encounter / clinical documentation, keyed by `noteType` so the same table
 * serves an odontogram, a refraction record, a vaccine card entry, or a
 * treatment plan without a table per specialty. `data` holds the
 * specialty-shaped fields; validate its shape with a per-`noteType` Zod
 * schema at the service layer. Edits are tracked via `audit_logs`
 * (non-negotiable #5), not row versioning.
 */
export const clinicalNotes = pgTable(
  "clinical_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    appointmentId: uuid("appointment_id").references(() => appointments.id), // deferred callback — safe despite the appointments.ts <-> patients.ts import cycle
    authorStaffId: uuid("author_staff_id").notNull().references(() => clinicStaff.id),
    noteType: text("note_type").notNull(), // 'general' | 'odontogram' | 'refraction' | 'vaccine_card' | 'treatment_plan'
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicPatientIdx: index("clinical_notes_clinic_patient_idx").on(table.clinicId, table.patientId),
  }),
);

/** Dental recalls, vet vaccine due dates, post-procedure check-ins. */
export const recalls = pgTable(
  "recalls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    recallType: text("recall_type").notNull(), // 'dental_recall' | 'vaccine_due' | 'post_procedure_checkin'
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("pending"), // 'pending' | 'notified' | 'completed' | 'cancelled'
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicDueDateIdx: index("recalls_clinic_due_date_idx").on(table.clinicId, table.dueDate),
    clinicPatientIdx: index("recalls_clinic_patient_idx").on(table.clinicId, table.patientId),
  }),
);
