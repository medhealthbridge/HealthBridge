import { z } from "zod";

// Trim first: z.email() validates before a trailing .trim() would run.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const inviteAdminSchema = z.object({ email });
export type InviteAdminField = "email";

// Same 8–128 bounds as sign-up, so an invitee can't set a password sign-up would reject.
export const acceptInviteSchema = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().max(120).default(""),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
});
export type AcceptInviteField = "name" | "password";

export const staffChangeSchema = z.object({ userId: z.string().min(1).max(100), active: z.enum(["true", "false"]) });
export const revokeInviteSchema = z.object({ inviteId: z.uuid() });
