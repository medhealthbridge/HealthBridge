CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_invited_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "clinical_notes" DROP CONSTRAINT "clinical_notes_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "clinical_notes" DROP CONSTRAINT "clinical_notes_appointment_id_appointments_id_fk";--> statement-breakpoint
ALTER TABLE "clinical_notes" DROP CONSTRAINT "clinical_notes_author_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "patient_attachments" DROP CONSTRAINT "patient_attachments_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "patient_attachments" DROP CONSTRAINT "patient_attachments_uploaded_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "recalls" DROP CONSTRAINT "recalls_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_practitioner_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_confirmed_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "hmo_claims" DROP CONSTRAINT "hmo_claims_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "hmo_claims" DROP CONSTRAINT "hmo_claims_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "invoice_line_items" DROP CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_patient_id_patients_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_appointment_id_appointments_id_fk";--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_created_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_batches" DROP CONSTRAINT "inventory_batches_item_id_inventory_items_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_transfers" DROP CONSTRAINT "inventory_transfers_from_clinic_id_clinics_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_transfers" DROP CONSTRAINT "inventory_transfers_to_clinic_id_clinics_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_transfers" DROP CONSTRAINT "inventory_transfers_item_id_inventory_items_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_transfers" DROP CONSTRAINT "inventory_transfers_requested_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "inventory_transfers" DROP CONSTRAINT "inventory_transfers_approved_by_staff_id_clinic_staff_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_user_id_unique" UNIQUE("owner_user_id");--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_account_id_id_unique" UNIQUE("account_id","id");--> statement-breakpoint
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_id_unique" UNIQUE("clinic_id","id");--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_id_unique" UNIQUE("clinic_id","id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_id_unique" UNIQUE("clinic_id","id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clinic_id_id_unique" UNIQUE("clinic_id","id");--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_clinic_id_id_unique" UNIQUE("clinic_id","id");--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_invited_by_fk" FOREIGN KEY ("clinic_id","invited_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_fk" FOREIGN KEY ("clinic_id","appointment_id") REFERENCES "public"."appointments"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_fk" FOREIGN KEY ("clinic_id","author_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachments" ADD CONSTRAINT "patient_attachments_uploaded_by_fk" FOREIGN KEY ("clinic_id","uploaded_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_fk" FOREIGN KEY ("clinic_id","practitioner_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_confirmed_by_fk" FOREIGN KEY ("clinic_id","confirmed_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_claims" ADD CONSTRAINT "hmo_claims_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_claims" ADD CONSTRAINT "hmo_claims_invoice_fk" FOREIGN KEY ("clinic_id","invoice_id") REFERENCES "public"."invoices"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_fk" FOREIGN KEY ("clinic_id","invoice_id") REFERENCES "public"."invoices"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_fk" FOREIGN KEY ("clinic_id","patient_id") REFERENCES "public"."patients"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_fk" FOREIGN KEY ("clinic_id","appointment_id") REFERENCES "public"."appointments"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_fk" FOREIGN KEY ("clinic_id","created_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_fk" FOREIGN KEY ("clinic_id","invoice_id") REFERENCES "public"."invoices"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_item_fk" FOREIGN KEY ("clinic_id","item_id") REFERENCES "public"."inventory_items"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_clinic_fk" FOREIGN KEY ("account_id","from_clinic_id") REFERENCES "public"."clinics"("account_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_clinic_fk" FOREIGN KEY ("account_id","to_clinic_id") REFERENCES "public"."clinics"("account_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_item_fk" FOREIGN KEY ("from_clinic_id","item_id") REFERENCES "public"."inventory_items"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_requested_by_fk" FOREIGN KEY ("from_clinic_id","requested_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_approved_by_fk" FOREIGN KEY ("to_clinic_id","approved_by_staff_id") REFERENCES "public"."clinic_staff"("clinic_id","id") ON DELETE no action ON UPDATE no action;
