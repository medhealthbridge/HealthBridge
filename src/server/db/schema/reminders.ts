import { pgTable, uuid, text, timestamp, index, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { clinics } from "./tenancy";
import { appointments } from "./appointments";

/**
 * One row per reminder sent (or failed) for an appointment. The unique index is
 * what stops a patient getting the same reminder twice, whether the daily job
 * runs again or two staff press "send now" together. Holds no message body.
 */
export const reminderLog = pgTable(
  "reminder_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    appointmentId: uuid("appointment_id").notNull(),
    kind: text("kind").notNull().default("day_before"),
    channel: text("channel").notNull().default("email"),
    status: text("status").notNull(), // 'sent' | 'failed'
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    appointmentKindIdx: uniqueIndex("reminder_log_appointment_kind_idx").on(table.appointmentId, table.kind, table.channel),
    clinicCreatedIdx: index("reminder_log_clinic_created_idx").on(table.clinicId, table.createdAt),
    reminderLogAppointmentFk: foreignKey({
      name: "reminder_log_appointment_fk",
      columns: [table.clinicId, table.appointmentId],
      foreignColumns: [appointments.clinicId, appointments.id],
    }),
  }),
);
