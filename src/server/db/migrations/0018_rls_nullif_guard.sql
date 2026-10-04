-- The tenant policies from the first migrations cast the session setting straight to uuid.
-- On a pooled connection that has already run a tenant query, an unset setting reads as an
-- empty string and the cast raises "invalid input syntax for type uuid" the moment a policy
-- is evaluated. That never showed while the app's role bypassed policies; it would the day
-- the app connects as a role that doesn't. NULLIF turns '' into NULL, which simply matches
-- no rows. Same rules otherwise; each policy is dropped and recreated in this migration's transaction.

DROP POLICY "tenant_isolation" ON "appointments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "appointments"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "audit_logs";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "audit_logs"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "clinic_staff";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinic_staff"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "clinical_notes";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinical_notes"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "domain_lookups";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "domain_lookups"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "hmo_claims";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "hmo_claims"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "inventory_batches";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_batches"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "inventory_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_items"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "invoice_line_items";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoice_line_items"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "invoices";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoices"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "patient_attachments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patient_attachments"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "patients";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patients"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "payments";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payments"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "recalls";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "recalls"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "staff_invites";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "staff_invites"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "accounts";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "accounts"
  USING ("id" = nullif(current_setting('app.current_account_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "subscriptions";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "subscriptions"
  USING ("account_id" = nullif(current_setting('app.current_account_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "inventory_transfers";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "inventory_transfers"
  USING ("account_id" = nullif(current_setting('app.current_account_id', true), '')::uuid);--> statement-breakpoint
DROP POLICY "tenant_isolation" ON "clinics";--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "clinics"
  USING ("account_id" = nullif(current_setting('app.current_account_id', true), '')::uuid OR "id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);
