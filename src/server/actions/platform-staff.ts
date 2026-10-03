"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { auth, requireSuperAdmin } from "@/src/server/auth";
import { db } from "@/src/server/db/client";
import { user } from "@/src/server/db/schema";
import { platformRoleOf } from "@/src/server/services/access";
import { sendPlatformInviteEmail } from "@/src/server/services/email";
import {
  AlreadyOnTeamError,
  claimInvite,
  createPlatformInvite,
  findOpenInvite,
  ForbiddenChangeError,
  grantPlatformStaff,
  releaseInvite,
  revokePlatformInvite,
  setPlatformStaffActive,
} from "@/src/server/services/platform-staff";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { adminUrl } from "@/src/lib/clinic-host";
import { ADMIN_INVITE_ROUTE, COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";
import { loginSchema } from "@/src/lib/schemas/auth";
import {
  acceptInviteSchema,
  inviteAdminSchema,
  revokeInviteSchema,
  staffChangeSchema,
  type AcceptInviteField,
  type InviteAdminField,
} from "@/src/lib/schemas/platform-staff";
import type { FormState } from "@/src/types/form-state";

const STAFF_PATH = `${COMPANY_ADMIN_ROUTE}/staff`;

export type InviteAdminState = FormState<InviteAdminField> & { sentTo?: string; emailed?: boolean };
export type AcceptInviteState = FormState<AcceptInviteField>;

export async function inviteAdminAction(_prev: InviteAdminState, data: FormData): Promise<InviteAdminState> {
  const inviter = await requireSuperAdmin();
  const values = { email: String(data.get("email") ?? "") };
  const parsed = inviteAdminSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const limit = await consumeRateLimit("platform-invite", inviter.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many invitations sent. Try again in a while." };

  let invite;
  try {
    invite = await createPlatformInvite(inviter.id, parsed.data.email);
  } catch (error) {
    if (error instanceof AlreadyOnTeamError) return { values, fieldErrors: { email: ["This person is already on the team."] } };
    throw error;
  }

  // The invite exists either way; if the email fails the admin can resend, which replaces it.
  let emailed = true;
  try {
    await sendPlatformInviteEmail(inviter, invite.email, adminUrl(`${ADMIN_INVITE_ROUTE}?token=${encodeURIComponent(invite.token)}`));
  } catch (error) {
    emailed = false;
    console.error("[email] platform invite failed:", error instanceof Error ? error.message : "unknown error");
  }
  revalidatePath(STAFF_PATH);
  return { sentTo: invite.email, emailed };
}

export async function revokeInviteAction(data: FormData) {
  await requireSuperAdmin();
  const parsed = revokeInviteSchema.safeParse({ inviteId: data.get("inviteId") });
  if (!parsed.success) return;
  await revokePlatformInvite(parsed.data.inviteId);
  revalidatePath(STAFF_PATH);
}

export async function setStaffActiveAction(data: FormData): Promise<{ message?: string }> {
  const actor = await requireSuperAdmin();
  const parsed = staffChangeSchema.safeParse({ userId: data.get("userId"), active: data.get("active") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  try {
    await setPlatformStaffActive(actor.id, parsed.data.userId, parsed.data.active === "true");
  } catch (error) {
    if (error instanceof ForbiddenChangeError) return { message: "That change isn't allowed." };
    throw error;
  }
  revalidatePath(STAFF_PATH);
  return {};
}

const INVALID_LINK = "This invitation is no longer valid. Ask for a new one.";

/** Public: the emailed single-use token is the credential, and the invite is claimed before anything else happens. */
export async function acceptInviteAction(_prev: AcceptInviteState, data: FormData): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
    token: data.get("token"),
    name: data.get("name") ?? "",
    password: data.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return Object.keys(fieldErrors).some((key) => key === "name" || key === "password") ? { fieldErrors } : { message: INVALID_LINK };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = await consumeRateLimit("platform-invite-accept", ip, { max: 10, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many attempts. Try again in a while." };

  const invite = await findOpenInvite(parsed.data.token);
  if (!invite) return { message: INVALID_LINK };
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1);
  if (!existing && parsed.data.name.length < 2) return { fieldErrors: { name: ["Enter your full name."] } };

  if (!(await claimInvite(invite.id))) return { message: INVALID_LINK };
  try {
    let userId = existing?.id;
    if (existing) {
      // An existing account proves itself with its own password; the invite doesn't replace it.
      await auth.api.signInEmail({ body: { email: invite.email, password: parsed.data.password }, headers: requestHeaders });
    } else {
      const created = await auth.api.signUpEmail({
        body: { name: parsed.data.name, email: invite.email, password: parsed.data.password },
        headers: requestHeaders,
      });
      userId = created.user.id;
    }
    await grantPlatformStaff(userId!);
    if (!existing) await auth.api.signInEmail({ body: { email: invite.email, password: parsed.data.password }, headers: requestHeaders });
  } catch (error) {
    await releaseInvite(invite.id);
    if (!(error instanceof APIError)) throw error;
    return { message: existing ? "That password doesn't match your existing account." : "We couldn't create your account. Try again." };
  }

  redirect(COMPANY_ADMIN_ROUTE);
}

export type AdminLoginState = FormState<"email" | "password">;

const BAD_LOGIN = "Incorrect email or password.";

/** The company admin's sign-in. Anyone who isn't on the team gets the same answer as a wrong password. */
export async function adminLoginAction(_prev: AdminLoginState, data: FormData): Promise<AdminLoginState> {
  const values = { email: String(data.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const requestHeaders = await headers();
  try {
    const { user: signedIn } = await auth.api.signInEmail({ body: parsed.data, headers: requestHeaders });
    if (!(await platformRoleOf(signedIn.id))) {
      // A valid Clinix account, but not DataBridgeSol staff: end the session just created.
      await auth.api.signOut({ headers: requestHeaders });
      return { values, message: BAD_LOGIN };
    }
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    return { values, message: error.statusCode === 429 ? "Too many attempts. Wait a few minutes and try again." : BAD_LOGIN };
  }

  redirect(COMPANY_ADMIN_ROUTE);
}
