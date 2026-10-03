CREATE TABLE "patient_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"medical" boolean DEFAULT false NOT NULL,
	"section" text DEFAULT 'Other details' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"scope" text DEFAULT 'standard' NOT NULL,
	"created_by_staff_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_field_definitions" ADD CONSTRAINT "patient_field_definitions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_field_definitions" ADD CONSTRAINT "patient_field_definitions_created_by_fk" FOREIGN KEY ("clinic_id","created_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_field_definitions_clinic_key_idx" ON "patient_field_definitions" USING btree ("clinic_id","key");--> statement-breakpoint
CREATE INDEX "patient_field_definitions_clinic_order_idx" ON "patient_field_definitions" USING btree ("clinic_id","sort_order");
--> statement-breakpoint
ALTER TABLE "patient_field_definitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_field_definitions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patient_field_definitions"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);
