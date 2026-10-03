import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinics } from "./tenancy";

/**
 * A clinic's price list: what it offers and charges. Money is integer centavos.
 * `vatExempt` marks services outside the VATable base (e.g. medical consults);
 * senior/PWD discounts are applied at checkout, not stored here. Retired
 * services are soft-deleted so past invoices can still name them.
 */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    name: text("name").notNull(),
    code: text("code"),
    category: text("category"),
    durationMinutes: integer("duration_minutes"),
    priceCentavos: integer("price_centavos").notNull(),
    vatExempt: boolean("vat_exempt").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicIdx: index("services_clinic_id_idx").on(table.clinicId),
    clinicIdIdUnique: unique("services_clinic_id_id_unique").on(table.clinicId, table.id),
    clinicNameActiveIdx: uniqueIndex("services_clinic_name_active_idx")
      .on(table.clinicId, sql`lower(${table.name})`)
      .where(sql`deleted_at is null`),
  }),
);
