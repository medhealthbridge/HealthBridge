CREATE TABLE "discount_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"requires_id" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"due_on" date NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dental_chart_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"tooth" integer NOT NULL,
	"surfaces" text,
	"kind" text NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"occurred_on" date NOT NULL,
	"appointment_id" uuid,
	"plan_item_id" uuid,
	"author_staff_id" uuid,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"phase" integer DEFAULT 1 NOT NULL,
	"service_id" uuid,
	"description" text NOT NULL,
	"tooth" integer,
	"surfaces" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"done_at" timestamp with time zone,
	"done_by_staff_id" uuid,
	"invoice_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"phase_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_by_staff_id" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treatment_plans_clinic_id_id_unique" UNIQUE("clinic_id","id")
);
--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD COLUMN "tooth" text;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD COLUMN "plan_item_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_label" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_kind" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_value" integer;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "paid_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "receipt_number" text;--> statement-breakpoint
ALTER TABLE "discount_types" ADD CONSTRAINT "discount_types_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_installments" ADD CONSTRAINT "invoice_installments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_installments" ADD CONSTRAINT "invoice_installments_invoice_fk" FOREIGN KEY ("clinic_id","invoice_id") REFERENCES "public"."invoices"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_appointment_fk" FOREIGN KEY ("clinic_id","appointment_id") REFERENCES "public"."appointments"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_author_fk" FOREIGN KEY ("clinic_id","author_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_plan_fk" FOREIGN KEY ("clinic_id","plan_id") REFERENCES "public"."treatment_plans"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_service_fk" FOREIGN KEY ("clinic_id","service_id") REFERENCES "public"."services"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_invoice_fk" FOREIGN KEY ("clinic_id","invoice_id") REFERENCES "public"."invoices"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_created_by_fk" FOREIGN KEY ("clinic_id","created_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discount_types_clinic_name_idx" ON "discount_types" USING btree ("clinic_id",lower("name")) WHERE archived_at is null;--> statement-breakpoint
CREATE INDEX "invoice_installments_clinic_invoice_idx" ON "invoice_installments" USING btree ("clinic_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_installments_clinic_due_idx" ON "invoice_installments" USING btree ("clinic_id","due_on");--> statement-breakpoint
CREATE INDEX "dental_chart_entries_clinic_patient_idx" ON "dental_chart_entries" USING btree ("clinic_id","patient_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_items_clinic_plan_idx" ON "treatment_plan_items" USING btree ("clinic_id","plan_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_clinic_patient_idx" ON "treatment_plans" USING btree ("clinic_id","patient_id");

--> statement-breakpoint
ALTER TABLE "discount_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_types" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "discount_types"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "invoice_installments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoice_installments" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoice_installments"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dental_chart_entries" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "dental_chart_entries"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "treatment_plan_items"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "treatment_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "treatment_plans" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "treatment_plans"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
-- Existing data: every earlier payment gets a receipt number in order, and each invoice's paid total is the sum of its payments.
UPDATE "payments" p SET "receipt_number" = 'PR-' || lpad(n.rn::text, 6, '0') FROM (SELECT id, row_number() OVER (PARTITION BY clinic_id ORDER BY created_at, id) AS rn FROM "payments") n WHERE p.id = n.id;--> statement-breakpoint
UPDATE "invoices" i SET "paid_cents" = COALESCE((SELECT sum(p.amount_cents) FROM "payments" p WHERE p.clinic_id = i.clinic_id AND p.invoice_id = i.id), 0);
