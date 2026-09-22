---
name: db-schema-architect
description: "Database schema design expertise for HealthBridge's multi-tenant clinic SaaS. Use when creating or changing tables, columns, indexes, constraints, relations, enums, or migrations; when designing a new domain (patients, appointments, staff, billing, subscriptions, clinics/tenants); when reviewing a schema or migration for correctness; or when the user mentions Drizzle schema, drizzle-kit, database design, normalization, foreign keys, multi-tenancy, tenant isolation, row-level security, RLS, audit log, soft delete, or ERD. Encodes this project's tenant-isolation model, healthcare data-handling rules, and Drizzle/Neon conventions so every new table follows the same pattern."
---

# DB Schema Architect — HealthBridge

Opinionated rules for designing Postgres schema on this project. HealthBridge is a B2B multi-tenant clinic platform (see `docs/healthbridge-plan.md`): one account can own multiple clinic "tenants," clinic data is treated as health-adjacent/sensitive by default, and billing is per-account with per-clinic tiers. Every schema decision below exists to serve that model — read it before adding or changing a table, not after.

## When to apply

- Adding a new table, column, index, constraint, or relation
- Writing or reviewing a Drizzle schema file or a generated migration
- Designing a new domain: patients, appointments, staff/roles, clinics, subscriptions, billing, audit trail
- Reviewing a PR that touches `src/server/db/schema.ts` (or its future `schema/` split)

## Non-negotiables (project-specific)

1. **ORM is Drizzle**, per `AGENTS.md`/`.cursor/rules/project-structure.mdc` — Prisma only if it's already in use (it isn't). One client at `src/server/db/client.ts`, schema at `src/server/db/schema.ts` (split into `src/server/db/schema/*.ts` by domain once a single file gets unwieldy — extract on second use, not before).
2. **Every tenant-scoped table carries `clinic_id`.** Shared database, not schema-per-tenant or database-per-tenant (see "Key Architectural Decisions" in `docs/healthbridge-plan.md`). No table holding clinic-specific data is exempt.
3. **Row-level security is defense in depth, not optional.** App-layer `WHERE clinic_id = ...` filtering is required but not sufficient — enable RLS and a policy on every tenant table (see below). A missed `WHERE` clause in a service function must not leak cross-tenant data.
4. **Never hard-delete clinical/patient records.** Soft delete (`deleted_at`) only. Confirmed in the plan: "Never delete clinic data on trial expiry or failed payment." The same discipline applies to any patient-adjacent row, not just billing state.
5. **Audit patient-related writes.** Anything touching a patient record needs an append-only audit trail entry (actor, clinic, entity, action, diff, timestamp) — required by the plan's "full audit logging on patient-related records," not a nice-to-have.
6. **Money is integer cents or `numeric`, never `float`/`real`.**
7. **Migrations run over the direct (non-pooled) Neon connection**, never the `-pooler` one — see the `neon-postgres` skill's pooled-vs-direct gotcha. Test every migration against a Neon branch with production-like data before applying to production.

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Table | plural, snake_case | `appointments`, `clinic_staff` |
| Column | singular, snake_case | `first_name`, `starts_at` |
| Primary key | `id` | `id uuid primary key default gen_random_uuid()` |
| Foreign key column | `<singular_table>_id` | `clinic_id`, `patient_id` |
| Boolean | `is_`/`has_` prefix | `is_active`, `has_completed_onboarding` |
| Timestamps | `created_at`, `updated_at`, both `timestamptz` | — |
| Soft delete | `deleted_at timestamptz null` | — |

Don't abbreviate domain nouns (`appointment` not `appt`, `patient` not `pt`) — this is clinical software; ambiguity in the schema becomes ambiguity in charts and audit logs.

## Primary keys

- Default to `uuid` with `defaultRandom()` (Postgres `gen_random_uuid()`) for anything that can be referenced from a URL, an external system (Stripe/Paddle customer, subdomain lookup), or a client. UUIDs avoid leaking row counts and let IDs be generated client-side before insert when a form needs an optimistic ID.
- Use `bigserial`/identity integer PKs only for pure-internal, high-volume, append-only tables where insertion order matters and nothing external ever references the id by value (e.g. a raw webhook-event log). Don't mix this in without a specific reason — uuid is the default.

## Multi-tenancy: `clinic_id` and RLS

Every tenant-scoped table:

```ts
// src/server/db/schema.ts
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id),
  patientId: uuid('patient_id').notNull().references(() => patients.id),
  // ...domain columns
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  clinicIdx: index('appointments_clinic_id_idx').on(table.clinicId),
  // tenant-scoped composite indexes always lead with clinic_id
  clinicStartsAtIdx: index('appointments_clinic_starts_at_idx').on(table.clinicId, table.startsAt),
}));
```

Then, in the generated migration (or a follow-up hand-written one committed alongside it), add RLS:

```sql
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON appointments
  USING (clinic_id = current_setting('app.current_clinic_id', true)::uuid);
```

The service/db layer must `SET LOCAL app.current_clinic_id = '<id>'` inside the same transaction as every tenant-scoped query — do this once, in the db client wrapper (`src/server/db/client.ts`) or a `withTenant()` helper, never inline per-query. Auth resolution (which clinic the current session may act as) lives in `src/server/auth.ts` per the project's architecture rule; the schema/RLS layer only trusts the session value it's handed.

**Tenant-scoped uniqueness is scoped, not global.** A business key that must be unique per clinic (e.g. a staff-facing patient chart number) is `unique(clinic_id, chart_number)`, not `unique(chart_number)`. Reserve a bare global unique constraint for things that are genuinely global — `clinics.subdomain`, account emails, Stripe customer ids.

## Soft delete

- `deleted_at timestamptz` nullable on every table holding patient, appointment, staff, or billing data.
- Partial unique indexes exclude soft-deleted rows so a new active row can reuse a business key a deleted one held:
  ```ts
  uniqueIndex('patients_clinic_mrn_active_idx')
    .on(table.clinicId, table.medicalRecordNumber)
    .where(sql`deleted_at is null`)
  ```
- Default query helpers filter `deleted_at is null`; an explicit `includeDeleted` param is required to see soft-deleted rows (audit/compliance views only).

## Audit trail

One append-only table, not a trigger-generated shadow table per entity (keeps it queryable and simple):

```ts
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id),
  actorId: uuid('actor_id').notNull().references(() => users.id),
  entityType: text('entity_type').notNull(), // 'patient', 'appointment', ...
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'view'
  diff: jsonb('diff'), // { before, after } for update; null for view
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  clinicEntityIdx: index('audit_logs_clinic_entity_idx').on(table.clinicId, table.entityType, table.entityId),
}));
```

Write audit entries from the **service layer**, in the same transaction as the mutation they describe — not from the Server Action, and not as an afterthought bolted on later. If a service function mutates a patient-adjacent table, it writes the matching audit row before returning.

## Enums: `pgEnum` vs `text` + Zod

- Use Drizzle `pgEnum` for values that are structurally stable and rarely change: roles (`admin`/`doctor`/`front_desk`), account status. `ALTER TYPE ... ADD VALUE` is cheap but can't run inside the same transaction as other DDL, which makes rollback awkward — accept that tradeoff only for enums you don't expect to touch often.
- Use `text` with a matching `z.enum([...])` in the Zod contract for values that evolve with product decisions: appointment status, subscription tier, masterlock state. Changing the allowed set is then a code change (Zod schema + a `CHECK` constraint update in a normal migration), not a type-alteration migration.
- Never duplicate the same enum as both a hand-written TS union and a Zod enum — derive one from the other (`z.infer<typeof statusSchema>`), per the project's "never duplicate a parallel interface" rule.

## Billing / subscription shape

Matches the plan's per-account, per-clinic-tier model — don't reinvent this when a billing table is needed:

```ts
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // one billing relationship; owns 1..n clinics
});

export const clinics = pgTable('clinics', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  subdomain: text('subdomain').notNull().unique(), // global — see custom-domain lookup below
  // ...
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id).unique(), // one active subscription per account
  tier: text('tier').notNull(), // 'tier_1'..'tier_4' | 'enterprise'
  status: text('status').notNull(), // 'trialing' | 'active' | 'past_due' | 'masterlocked'
  clinicSlotLimit: integer('clinic_slot_limit').notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEndsAt: timestamp('current_period_ends_at', { withTimezone: true }),
});
```

`status = 'masterlocked'` blocks dashboard access and new-clinic creation at the service layer (per the plan's masterlock rule) — enforce that in `src/server/services/`, not by deleting or hiding rows.

**Custom domains**: a `domain_lookups` table (`domain text unique primary key`, `clinic_id uuid references clinics.id`) mapping `subdomain.databridgesol.space` and future `portal.theirclinic.com` to a `clinic_id`, so custom-domain support is a config row later, not a rebuild — this is called out explicitly as a "lock down early" decision in the plan.

## Indexing rules

- Index every foreign key column. Drizzle doesn't do this automatically.
- Composite indexes for tenant-scoped list/filter queries always lead with `clinic_id`.
- Add indexes when a query pattern exists, not speculatively for every column — this is the same "extract on second use" discipline as the rest of the codebase, applied to indexes.
- Partial indexes (`WHERE deleted_at IS NULL`, `WHERE status = 'active'`) over a wider index + app-side filtering, when the table is large and the filtered condition is the common case.

## Workflow (matches `AGENTS.md`)

1. **Schema/migration first.** Change `src/server/db/schema.ts`, run `drizzle-kit generate`, read the generated SQL before applying it — never hand-edit a migration that's already been applied.
2. **Zod contract**, shared with the form: derive with `drizzle-zod` (`createInsertSchema`/`createSelectSchema`) rather than writing a parallel Zod schema by hand, unless the insert shape genuinely diverges from the table (e.g. server-set `clinic_id`, `created_at`).
3. **Service** (`src/server/services/`): plain TypeScript, assumes validated input, owns the RLS-tenant-context transaction and any audit-log write.
4. **Action/handler**: validates, calls the service, shapes the response.
5. **UI**, then `revalidatePath`/`revalidateTag` on every mutation.
6. Test the migration on a Neon branch against production-like data before it touches production (`neon-postgres` skill covers branch workflow).

## Pre-merge checklist

- [ ] Every tenant-scoped table has `clinic_id`, indexed, leading any composite index
- [ ] RLS enabled + policy added for every new tenant-scoped table
- [ ] No hard delete on patient/clinical/billing rows — `deleted_at` instead
- [ ] Patient-record mutations write an `audit_logs` row in the same transaction
- [ ] Money columns are `integer` (cents) or `numeric`, never `float`/`real`
- [ ] FKs indexed; tenant-scoped uniqueness is `unique(clinic_id, ...)`, not global
- [ ] Enum choice (`pgEnum` vs `text`+Zod) matches how often the value set changes
- [ ] Zod schema derived from the Drizzle table, not hand-duplicated
- [ ] Migration generated via `drizzle-kit`, reviewed, and run over the **direct** (non-pooled) connection
- [ ] Migration tested on a Neon branch before production
