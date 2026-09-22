import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Billing entity. One account owns 1..n clinics and has exactly one
 * subscription. No `deletedAt`: per docs/healthbridge-plan.md, clinic and
 * account data is never deleted on trial expiry or non-payment — the
 * subscription is "masterlocked" instead (see `subscriptions.status`).
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id),
  companyName: text("company_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/**
 * A tenant: one clinic on one subdomain. `specialty` is `text` (not a
 * pgEnum) because the product line grows (dental/eye/vet/derma today) —
 * see db-schema-architect skill's enum guidance. No `deletedAt` here either,
 * same reasoning as `accounts`.
 */
export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    name: text("name").notNull(),
    subdomain: text("subdomain").notNull().unique(),
    specialty: text("specialty").notNull(), // 'dental' | 'eye' | 'vet' | 'derma' | 'general'
    address: text("address"),
    phone: text("phone"),
    timezone: text("timezone").notNull().default("Asia/Manila"),
    businessHours: jsonb("business_hours"),
    brandingPrimaryColor: text("branding_primary_color"),
    brandingAccentColor: text("branding_accent_color"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index("clinics_account_id_idx").on(table.accountId),
  }),
);

/**
 * One active subscription per account (per-account billing, per-clinic-tier
 * slot limit — docs/healthbridge-plan.md section 2). `status` and `tier` are
 * `text` + a Zod enum at the contract layer, since tiers/status evolve with
 * pricing decisions, not the schema.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().unique().references(() => accounts.id),
  tier: text("tier").notNull(), // 'tier_1'..'tier_4' | 'enterprise'
  billingInterval: text("billing_interval").notNull(), // 'monthly' | 'annual'
  status: text("status").notNull(), // 'trialing' | 'active' | 'past_due' | 'masterlocked' | 'canceled'
  clinicSlotLimit: integer("clinic_slot_limit").notNull(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

/**
 * subdomain.databridgesol.space today; a custom domain (portal.theirclinic.com)
 * later is a new row here, not a rebuild — see plan section 4.
 */
export const domainLookups = pgTable(
  "domain_lookups",
  {
    domain: text("domain").primaryKey(),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clinicIdx: index("domain_lookups_clinic_id_idx").on(table.clinicId),
  }),
);
