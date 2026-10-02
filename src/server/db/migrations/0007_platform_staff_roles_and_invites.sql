-- platform_admins and platform_invites are global (DataBridgeSol's own team), so
-- there is no clinic to scope them by and no tenant policy. They are reached
-- only by server code that has passed requirePlatformAdmin()/requireSuperAdmin(),
-- or by an emailed single-use token (src/server/services/platform-staff.ts).
CREATE TABLE "platform_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "platform_admins" ADD COLUMN "role" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_admins" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_invites" ADD CONSTRAINT "platform_invites_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_invites_email_idx" ON "platform_invites" USING btree ("email");--> statement-breakpoint
-- Everyone already on the team before roles existed is the founder account.
UPDATE "platform_admins" SET "role" = 'super_admin';
