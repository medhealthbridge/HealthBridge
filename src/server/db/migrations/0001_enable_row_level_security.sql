-- Row-level security: defense in depth behind the app-layer `WHERE clinic_id
-- = ...` filtering every service function already does. `src/server/db/client.ts`'s
-- `withTenant`/`withAccount` are the only place that sets these session
-- variables (`SET LOCAL app.current_clinic_id` / `app.current_account_id`),
-- inside the same transaction as the query — never inline per-query.
--
-- Tables scoped by a single clinic read `app.current_clinic_id`.
-- `subscriptions`, `domain_lookups` and `inventory_transfers` span (or
-- belong above) more than one clinic under the same account, so they read
-- `app.current_account_id` instead — see tenancy.ts / inventory.ts comments.
--
-- IMPORTANT — Postgres exempts a table's OWNER from its own RLS policies
-- unless the table is set to FORCE ROW LEVEL SECURITY (every ALTER below
-- does this). Without FORCE, this migration would silently do nothing: the
-- app's DB role is almost always the same role that ran the migration, i.e.
-- the owner. FORCE closes that gap so RLS is enforced even for the owner
-- role, not just for a hypothetical lower-privileged app role.
--
-- This means account/clinic CREATION (before any tenant context exists) has
-- no bypass role to fall back on. The pattern: generate the new account's
-- (or clinic's) uuid client-side, call `withAccount(thatId, tx => tx.insert(accounts)...)`
-- (or `withTenant` for a clinic) so `app.current_account_id`/`app.current_clinic_id`
-- is already set to the row's own id *before* the insert — the policy's
-- WITH CHECK then matches the row being created. See services that create
-- accounts/clinics.
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "accounts"
  USING ("id" = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "clinics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinics" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinics"
  USING ("account_id" = current_setting('app.current_account_id', true)::uuid
    OR "id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "subscriptions"
  USING ("account_id" = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "domain_lookups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domain_lookups" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "domain_lookups"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "clinic_staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinic_staff" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinic_staff"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "staff_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_invites" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "staff_invites"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patients"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "patient_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_attachments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patient_attachments"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "clinical_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_notes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinical_notes"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "recalls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recalls" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "recalls"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "appointments"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoices"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "invoice_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_line_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoice_line_items"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payments"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "hmo_claims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hmo_claims" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hmo_claims"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_items"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "inventory_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_batches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_batches"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "inventory_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_transfers" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_transfers"
  USING ("account_id" = current_setting('app.current_account_id', true)::uuid);--> statement-breakpoint

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "audit_logs"
  USING ("clinic_id" = current_setting('app.current_clinic_id', true)::uuid);
