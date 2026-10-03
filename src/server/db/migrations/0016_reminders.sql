CREATE TABLE "reminder_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"kind" text DEFAULT 'day_before' NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "reminders_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_log" ADD CONSTRAINT "reminder_log_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_log" ADD CONSTRAINT "reminder_log_appointment_fk" FOREIGN KEY ("clinic_id","appointment_id") REFERENCES "public"."appointments"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_log_appointment_kind_idx" ON "reminder_log" USING btree ("appointment_id","kind","channel");--> statement-breakpoint
CREATE INDEX "reminder_log_clinic_created_idx" ON "reminder_log" USING btree ("clinic_id","created_at");
--> statement-breakpoint
ALTER TABLE "reminder_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reminder_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "reminder_log"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);
