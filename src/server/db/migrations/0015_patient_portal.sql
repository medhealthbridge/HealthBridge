CREATE TABLE "patient_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_staff_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_invites_clinic_patient_idx" ON "patient_invites" USING btree ("clinic_id","patient_id");
--> statement-breakpoint
ALTER TABLE "patient_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patient_invites" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "patient_invites"
  USING ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid)
  WITH CHECK ("clinic_id" = nullif(current_setting('app.current_clinic_id', true), '')::uuid);--> statement-breakpoint
-- Redeeming the emailed link happens before any clinic is known: only the row whose hash was set by `withInviteToken`.
CREATE POLICY "patient_invite_by_token" ON "patient_invites"
  USING ("token_hash" = nullif(current_setting('app.current_invite_hash', true), ''))
  WITH CHECK ("token_hash" = nullif(current_setting('app.current_invite_hash', true), ''));--> statement-breakpoint
-- A patient finds their own record (and so which clinic it is at) before any clinic is chosen. SELECT only.
CREATE POLICY "patient_self_read" ON "patients" FOR SELECT
  USING ("portal_user_id" = current_setting('app.current_user_id', true));
