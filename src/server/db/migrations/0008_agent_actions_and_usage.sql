CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"args" jsonb NOT NULL,
	"summary" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feature" text DEFAULT 'admin_assistant' NOT NULL,
	"layer" text NOT NULL,
	"provider" text,
	"model" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_actions_user_id_idx" ON "agent_actions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_usage_user_created_idx" ON "agent_usage" USING btree ("user_id","created_at");--> statement-breakpoint
-- Company-admin tables with no clinic or tenant, like platform_admins: no tenant
-- policy; reached only by server code after requireSuperAdmin()/requirePlatformAdmin().
-- The assistant's tenant changes (tier, lock) update subscriptions from the company
-- admin, so the platform_admin_read policy gets an UPDATE twin.
CREATE POLICY "platform_admin_update" ON "subscriptions" FOR UPDATE
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');
