CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"category" text,
	"duration_minutes" integer,
	"price_centavos" integer NOT NULL,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "services_clinic_id_id_unique" UNIQUE("clinic_id","id")
);
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_clinic_id_idx" ON "services" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_clinic_name_active_idx" ON "services" USING btree ("clinic_id",lower("name")) WHERE deleted_at is null;--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "services"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);
