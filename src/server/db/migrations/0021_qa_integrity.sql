ALTER TABLE "invoices" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "request_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_clinic_request_idx" ON "invoices" USING btree ("clinic_id","request_id") WHERE request_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_clinic_receipt_idx" ON "payments" USING btree ("clinic_id","receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_clinic_request_idx" ON "payments" USING btree ("clinic_id","request_id") WHERE request_id is not null;--> statement-breakpoint
-- QA 2026-10-10 (BUG-009): the database enforces the rules too, not only the app.
-- FDI tooth numbers: permanent 11-18, 21-28, 31-38, 41-48; baby 51-55, 61-65, 71-75, 81-85.
CREATE OR REPLACE FUNCTION is_fdi_tooth(t integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT (t / 10 BETWEEN 1 AND 4 AND t % 10 BETWEEN 1 AND 8) OR (t / 10 BETWEEN 5 AND 8 AND t % 10 BETWEEN 1 AND 5)
$$;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_status_check" CHECK (status IN ('draft','proposed','accepted','in_progress','completed','cancelled'));--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_status_check" CHECK (status IN ('planned','done','cancelled'));--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_quantity_check" CHECK (quantity BETWEEN 1 AND 32);--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_price_check" CHECK (unit_price_cents BETWEEN 0 AND 100000000);--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_phase_check" CHECK (phase BETWEEN 1 AND 8);--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_tooth_check" CHECK (tooth IS NULL OR is_fdi_tooth(tooth));--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_clinic_id_id_unique" UNIQUE ("clinic_id","id");--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_tooth_check" CHECK (is_fdi_tooth(tooth));--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_kind_check" CHECK (kind IN ('condition','procedure'));--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_code_check" CHECK (code IN ('caries','fracture','periapical','mobility','impacted','missing','watch','filling','sealant','veneer','crown','rct','bridge','implant','extraction'));--> statement-breakpoint
ALTER TABLE "dental_chart_entries" ADD CONSTRAINT "dental_chart_entries_plan_item_fk" FOREIGN KEY ("clinic_id","plan_item_id") REFERENCES "treatment_plan_items"("clinic_id","id");--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_plan_item_fk" FOREIGN KEY ("clinic_id","plan_item_id") REFERENCES "treatment_plan_items"("clinic_id","id");--> statement-breakpoint
ALTER TABLE "discount_types" ADD CONSTRAINT "discount_types_value_check" CHECK ((kind = 'percent' AND value BETWEEN 1 AND 100) OR (kind = 'fixed' AND value > 0));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK (amount_cents > 0);--> statement-breakpoint
ALTER TABLE "invoice_installments" ADD CONSTRAINT "invoice_installments_amount_check" CHECK (amount_cents > 0);--> statement-breakpoint
ALTER TABLE "invoice_installments" ADD CONSTRAINT "invoice_installments_sequence_unique" UNIQUE ("invoice_id","sequence");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amounts_check" CHECK (total_cents >= 0 AND paid_cents >= 0 AND paid_cents <= total_cents);--> statement-breakpoint
-- Gap G8: "delete" means void/cancel/archive. The app role can't hard-delete money or clinical rows.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinix_app') THEN
    REVOKE DELETE ON invoices, invoice_line_items, payments, invoice_installments, treatment_plans, treatment_plan_items, dental_chart_entries, clinical_notes, recalls, patients FROM clinix_app;
  END IF;
END $$;
