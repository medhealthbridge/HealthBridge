import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { clinics } from "./tenancy";
import { clinicStaff } from "./staff";
import { patients } from "./patients";

/**
 * Per-chair/room booking + walk-in queue. `status` and `source` are `text`
 * (not pgEnum) since the workflow keeps growing (see db-schema-architect
 * skill's enum guidance) — validate the allowed set with a Zod enum at the
 * action boundary.
 */
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    practitionerStaffId: uuid("practitioner_staff_id").references(() => clinicStaff.id),
    confirmedByStaffId: uuid("confirmed_by_staff_id").references(() => clinicStaff.id),
    chairOrRoom: text("chair_or_room"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("requested"), // 'requested' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    source: text("source").notNull().default("walk_in"), // 'walk_in' | 'online' | 'phone'
    queueNumber: integer("queue_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicStartsAtIdx: index("appointments_clinic_starts_at_idx").on(table.clinicId, table.startsAt),
    clinicPatientIdx: index("appointments_clinic_patient_idx").on(table.clinicId, table.patientId),
  }),
);
