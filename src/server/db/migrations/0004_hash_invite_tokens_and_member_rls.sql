-- Invite tokens are stored as SHA-256 hex (see src/server/services/tokens.ts),
-- never raw. Existing rows are hashed in place with the same function, so any
-- link already sent still redeems via sha256Hex(submittedToken).
ALTER TABLE "staff_invites" RENAME COLUMN "token" TO "token_hash";--> statement-breakpoint
ALTER TABLE "staff_invites" RENAME CONSTRAINT "staff_invites_token_unique" TO "staff_invites_token_hash_unique";--> statement-breakpoint
UPDATE "staff_invites" SET "token_hash" = encode(sha256(convert_to("token_hash", 'UTF8')), 'hex');--> statement-breakpoint

-- Attachments hold a private-bucket object key, served via short-lived signed
-- URLs — not a public URL.
ALTER TABLE "patient_attachments" RENAME COLUMN "file_url" TO "storage_key";--> statement-breakpoint

-- "Which clinics am I staff at?" has to be answerable before any clinic is
-- chosen, so a user may read their own membership rows. Set only by
-- `withUser` in src/server/db/client.ts, from the verified session's user id.
-- SELECT only: writes still go through the clinic-scoped tenant_isolation policy.
CREATE POLICY "member_read" ON "clinic_staff" FOR SELECT
  USING ("user_id" = current_setting('app.current_user_id', true));
