-- No row-level security on this table on purpose: a payment webhook arrives
-- knowing only the order id, before any clinic is known, so it can't set
-- app.current_clinic_id. Like rate_limits it is a platform billing table, only
-- read by server code that has authorised the caller or verified a provider
-- signature (src/server/services/domain-orders.ts).
CREATE TABLE "domain_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"years" integer DEFAULT 1 NOT NULL,
	"vercel_price_usd" numeric(10, 2) NOT NULL,
	"plan_centavos" integer NOT NULL,
	"domain_centavos" integer NOT NULL,
	"total_centavos" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"vercel_order_id" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "domain_orders" ADD CONSTRAINT "domain_orders_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_orders" ADD CONSTRAINT "domain_orders_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_orders_clinic_id_idx" ON "domain_orders" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_orders_domain_live_idx" ON "domain_orders" USING btree ("domain") WHERE status in ('pending_payment','paid','purchasing','active','needs_review');--> statement-breakpoint
CREATE INDEX "domain_orders_provider_ref_idx" ON "domain_orders" USING btree ("provider","provider_ref");
--> statement-breakpoint
-- Resolving a request's host to its clinic happens before any clinic is known,
-- so the host -> clinic mapping must be readable without tenant context. It is
-- routing data (a public hostname and an id), not clinic data.
CREATE POLICY "public_resolve" ON "domain_lookups" FOR SELECT USING (true);
