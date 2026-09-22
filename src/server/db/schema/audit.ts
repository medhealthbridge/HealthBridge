import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { clinics } from "./tenancy";
import { user } from "./auth";

/**
 * Append-only. Every patient-record mutation (and view) writes a row here,
 * in the same transaction as the mutation, from the service layer
 * (non-negotiable #5) — never from the action/handler, never bolted on
 * after the fact.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    actorUserId: text("actor_user_id").notNull().references(() => user.id),
    entityType: text("entity_type").notNull(), // 'patient' | 'appointment' | 'invoice' | ...
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'view'
    diff: jsonb("diff"), // { before, after } for update; null for view
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicEntityIdx: index("audit_logs_clinic_entity_idx").on(table.clinicId, table.entityType, table.entityId),
  }),
);
