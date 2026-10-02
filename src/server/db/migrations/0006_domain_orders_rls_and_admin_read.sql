ALTER TABLE "domain_orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- domain_orders gets the same tenant isolation as every other clinic table.
-- The payment webhook knows only an order id from a signed payload, so a second
-- way in is allowed: `app.current_order_id` (set by `withOrder`) opens that one
-- order. nullif() because a custom setting reads '' (not NULL) once its
-- transaction-local value has been reset, and ''::uuid would raise.
ALTER TABLE "domain_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "domain_orders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "domain_orders"
  USING (
    "clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid
    OR "id" = nullif(current_setting('app.current_order_id', true), '')::uuid
  );--> statement-breakpoint
-- The company admin lists every tenant. SELECT only, and only inside
-- `withPlatformAdmin`, which callers use after requirePlatformAdmin().
CREATE POLICY "platform_admin_read" ON "accounts" FOR SELECT USING (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "platform_admin_read" ON "clinics" FOR SELECT USING (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "platform_admin_read" ON "subscriptions" FOR SELECT USING (current_setting('app.platform_admin', true) = 'on');--> statement-breakpoint
CREATE POLICY "platform_admin_read" ON "domain_orders" FOR SELECT USING (current_setting('app.platform_admin', true) = 'on');
