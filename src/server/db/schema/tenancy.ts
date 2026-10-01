import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  numeric,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";

/**
 * Billing entity. One account owns 1..n clinics and has exactly one
 * subscription. No `deletedAt`: per docs/healthbridge-plan.md, clinic and
 * account data is never deleted on trial expiry or non-payment — the
 * subscription is "masterlocked" instead (see `subscriptions.status`).
 * One account per owner (`ownerUserId` unique): more clinics are added to
 * the same account, never by onboarding a second one.
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull().unique().references(() => user.id),
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
    brandingFont: text("branding_font"), // FONT_PAIRINGS key, see src/lib/constants.ts
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index("clinics_account_id_idx").on(table.accountId),
    accountIdIdUnique: unique("clinics_account_id_id_unique").on(table.accountId, table.id),
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

/**
 * One purchase made at the end of onboarding: the first month of the plan plus
 * a custom domain, paid in a single PHP charge. The domain is bought only after
 * the payment webhook confirms the money (`pending_payment` → `paid` →
 * `purchasing` → `active`), and `status` is only ever moved with a guarded
 * UPDATE so a repeated webhook can't buy the domain twice. Amounts are
 * centavos; `vercelPriceUsd` is the quote the charge was built from and the
 * `expectedPrice` the registrar must still honour at purchase time.
 */
export const domainOrders = pgTable(
  "domain_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accounts.id),
    clinicId: uuid("clinic_id").notNull().references(() => clinics.id),
    domain: text("domain").notNull(),
    years: integer("years").notNull().default(1),
    vercelPriceUsd: numeric("vercel_price_usd", { precision: 10, scale: 2 }).notNull(),
    planCentavos: integer("plan_centavos").notNull(),
    domainCentavos: integer("domain_centavos").notNull(),
    totalCentavos: integer("total_centavos").notNull(),
    provider: text("provider").notNull(), // 'paymongo' | 'xendit'
    providerRef: text("provider_ref"), // checkout session / invoice id
    status: text("status").notNull().default("pending_payment"), // 'pending_payment' | 'paid' | 'purchasing' | 'active' | 'needs_review' | 'expired'
    vercelOrderId: text("vercel_order_id"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    clinicIdx: index("domain_orders_clinic_id_idx").on(table.clinicId),
    // A domain can have one live order at a time; abandoned ones are 'expired'.
    domainLiveIdx: uniqueIndex("domain_orders_domain_live_idx")
      .on(table.domain)
      .where(sql`status in ('pending_payment','paid','purchasing','active','needs_review')`),
    providerRefIdx: index("domain_orders_provider_ref_idx").on(table.provider, table.providerRef),
  }),
);
