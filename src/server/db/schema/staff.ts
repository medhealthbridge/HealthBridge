import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { clinics } from "./tenancy";

// Stable, rarely-changed role set (landing copy: Owner / Practitioner /
// Assistant) — pgEnum per db-schema-architect skill's guidance. "Patient"
// and "Platform admin" are not clinic staff, see patients.ts / below.
export const staffRoleEnum = pgEnum("staff_role", ["owner", "practitioner", "assistant"]);

/**
 * A user's membership at one clinic. Deactivation ("records stay, access
 * stops") is `isActive = false`, not a delete — the row (and its audit
 * trail) must survive. `pinHash` backs the shared front-desk terminal
 * quick-PIN lock.
 */
export const clinicStaff = pgTable(
  "clinic_staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    userId: text("user_id").notNull().references(() => user.id),
    role: staffRoleEnum("role").notNull(),
    pinHash: text("pin_hash"),
    isActive: boolean("is_active").notNull().default(true),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    clinicIdx: index("clinic_staff_clinic_id_idx").on(table.clinicId),
    clinicIdIdUnique: unique("clinic_staff_clinic_id_id_unique").on(table.clinicId, table.id),
    clinicUserActiveIdx: uniqueIndex("clinic_staff_clinic_user_active_idx")
      .on(table.clinicId, table.userId)
      .where(sql`deleted_at is null`),
  }),
);

export const staffInvites = pgTable(
  "staff_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    email: text("email").notNull(),
    role: staffRoleEnum("role").notNull(),
    invitedByStaffId: uuid("invited_by_staff_id"),
    // SHA-256 of the emailed token (see services/tokens.ts) — the raw token is
    // never stored, so a database read can't be replayed as an invite link.
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'revoked' | 'expired'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicIdx: index("staff_invites_clinic_id_idx").on(table.clinicId),
    staffInvitesInvitedByFk: foreignKey({
      name: "staff_invites_invited_by_fk",
      columns: [table.clinicId, table.invitedByStaffId],
      foreignColumns: [clinicStaff.clinicId, clinicStaff.id],
    }),
  }),
);

/**
 * DataBridgeSol's own team (subscription/support access across accounts,
 * never patient data — landing copy's "Platform admin" role). Global, not
 * tenant-scoped: no clinic_id, no RLS tenant policy.
 */
export const platformAdmins = pgTable("platform_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
