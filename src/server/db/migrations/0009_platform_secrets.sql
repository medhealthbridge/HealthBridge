CREATE TABLE "platform_secrets" (
	"key" text PRIMARY KEY NOT NULL,
	"value_encrypted" text NOT NULL,
	"last4" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_secrets" ADD CONSTRAINT "platform_secrets_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Company-admin table with no tenant, like platform_admins/agent_actions: no tenant
-- policy. Values are AES-256-GCM ciphertext; reached only after requireSuperAdmin().
