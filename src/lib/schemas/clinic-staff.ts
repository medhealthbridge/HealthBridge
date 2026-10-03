import { z } from "zod";
import { INVITABLE_STAFF_ROLES } from "@/src/lib/constants";

// Trim first: z.email() validates before a trailing .trim() would run.
const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const inviteStaffSchema = z.object({ email, role: z.enum(INVITABLE_STAFF_ROLES, "Choose a role.") });
export type InviteStaffField = keyof z.input<typeof inviteStaffSchema>;

export const changeRoleSchema = z.object({ staffId: z.uuid(), role: z.enum(INVITABLE_STAFF_ROLES) });
export const setActiveSchema = z.object({ staffId: z.uuid(), active: z.enum(["true", "false"]) });
export const inviteIdSchema = z.object({ inviteId: z.uuid() });

// Same 8–128 bounds as sign-up.
export const joinSchema = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().max(120).default(""),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
});
export type JoinField = "name" | "password";
