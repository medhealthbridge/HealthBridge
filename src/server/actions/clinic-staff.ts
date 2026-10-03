"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { db } from "@/src/server/db/client";
import { user } from "@/src/server/db/schema";
import { acceptWithAccount } from "@/src/server/invitee-auth";
import { describeStaffClinics } from "@/src/server/services/clinic-app";
import {
  AlreadyMemberError,
  changeStaffRole,
  claimStaffInvite,
  findOpenStaffInvite,
  getInvite,
  InviteNotFoundError,
  inviteStaffAndEmail,
  joinClinic,
  ProtectedStaffError,
  releaseStaffInvite,
  revokeStaffInvite,
  setStaffActive,
  StaffNotFoundError,
} from "@/src/server/services/clinic-staff";
import { listActiveMemberships } from "@/src/server/services/access";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { roleHome } from "@/src/lib/clinic-app-nav";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { changeRoleSchema, inviteIdSchema, inviteStaffSchema, joinSchema, setActiveSchema, type InviteStaffField, type JoinField } from "@/src/lib/schemas/clinic-staff";
import type { FormState } from "@/src/types/form-state";

const PATH = `${CLINIX_ROUTES.admin}/staff`;

export type InviteStaffState = FormState<InviteStaffField> & { sentTo?: string; emailed?: boolean };
export type JoinState = FormState<JoinField>;

/** Owner invites a front-desk assistant or practitioner to this clinic. */
export async function inviteStaffAction(_prev: InviteStaffState, data: FormData): Promise<InviteStaffState> {
  const { user: owner, clinic } = await requireActiveClinicOwner();
  const values = { email: String(data.get("email") ?? ""), role: String(data.get("role") ?? "") };
  const parsed = inviteStaffSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const limit = await consumeRateLimit("clinic-invite", owner.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many invitations. Try again in a while." };

  try {
    const sent = await inviteStaffAndEmail(clinic, owner, parsed.data.email, parsed.data.role);
    revalidatePath(PATH);
    return { sentTo: sent.email, emailed: sent.emailed };
  } catch (error) {
    if (error instanceof AlreadyMemberError) return { values, fieldErrors: { email: ["This person already works at the clinic."] } };
    throw error;
  }
}

type Result = { message?: string };
const NOT_ALLOWED: Result = { message: "That change isn't allowed." };

export async function resendInviteAction(data: FormData): Promise<Result & { emailed?: boolean }> {
  const { user: owner, clinic } = await requireActiveClinicOwner();
  const parsed = inviteIdSchema.safeParse({ inviteId: data.get("inviteId") });
  if (!parsed.success) return NOT_ALLOWED;
  const limit = await consumeRateLimit("clinic-invite", owner.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many invitations. Try again in a while." };
  const invite = await getInvite(clinic.id, parsed.data.inviteId);
  if (!invite) return { message: "That invitation is gone." };
  const sent = await inviteStaffAndEmail(clinic, owner, invite.email, invite.role);
  revalidatePath(PATH);
  return { emailed: sent.emailed };
}

export async function revokeInviteAction(data: FormData): Promise<Result> {
  const { user: owner, clinic } = await requireActiveClinicOwner();
  const parsed = inviteIdSchema.safeParse({ inviteId: data.get("inviteId") });
  if (!parsed.success) return NOT_ALLOWED;
  try {
    await revokeStaffInvite(clinic, owner.id, parsed.data.inviteId);
  } catch (error) {
    if (error instanceof InviteNotFoundError) return { message: "That invitation is already gone." };
    throw error;
  }
  revalidatePath(PATH);
  return {};
}

async function guarded(run: () => Promise<void>): Promise<Result> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ProtectedStaffError) return { message: "Owners and your own account can't be changed here." };
    if (error instanceof StaffNotFoundError) return { message: "That person isn't on your staff." };
    throw error;
  }
  revalidatePath(PATH);
  return {};
}

export async function changeRoleAction(data: FormData): Promise<Result> {
  const { user: owner, clinic } = await requireActiveClinicOwner();
  const parsed = changeRoleSchema.safeParse({ staffId: data.get("staffId"), role: data.get("role") });
  if (!parsed.success) return NOT_ALLOWED;
  return guarded(() => changeStaffRole(clinic, owner.id, parsed.data.staffId, parsed.data.role));
}

export async function setStaffActiveAction(data: FormData): Promise<Result> {
  const { user: owner, clinic } = await requireActiveClinicOwner();
  const parsed = setActiveSchema.safeParse({ staffId: data.get("staffId"), active: data.get("active") });
  if (!parsed.success) return NOT_ALLOWED;
  return guarded(() => setStaffActive(clinic, owner.id, parsed.data.staffId, parsed.data.active === "true"));
}

const INVALID_LINK = "This invitation is no longer valid. Ask the clinic for a new one.";

/** Public: the emailed single-use token is the credential, and the invite is claimed before anything else happens. */
export async function acceptStaffInviteAction(_prev: JoinState, data: FormData): Promise<JoinState> {
  const parsed = joinSchema.safeParse({ token: data.get("token"), name: data.get("name") ?? "", password: data.get("password") });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return fieldErrors.name || fieldErrors.password ? { fieldErrors } : { message: INVALID_LINK };
  }
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = await consumeRateLimit("staff-invite-accept", ip, { max: 10, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many attempts. Try again in a while." };

  const invite = await findOpenStaffInvite(parsed.data.token);
  if (!invite) return { message: INVALID_LINK };
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1);
  if (!existing && parsed.data.name.length < 2) return { fieldErrors: { name: ["Enter your full name."] } };

  const claimed = await claimStaffInvite(parsed.data.token);
  if (!claimed) return { message: INVALID_LINK };
  try {
    await acceptWithAccount({
      email: invite.email,
      name: parsed.data.name,
      password: parsed.data.password,
      existingUserId: existing?.id,
      headers: requestHeaders,
      grant: (userId) => joinClinic(claimed.clinicId, userId, claimed.role),
    });
  } catch (error) {
    await releaseStaffInvite(parsed.data.token);
    if (!(error instanceof APIError)) throw error;
    return { message: existing ? "That password doesn't match your existing account." : "We couldn't create your account. Try again." };
  }

  // Land on the role's own home (or the app router if they work at several clinics).
  const memberships = await listActiveMemberships((await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1))[0].id);
  const role = (await describeStaffClinics(memberships)).find((clinic) => clinic.id === claimed.clinicId)?.role ?? "assistant";
  redirect(memberships.length > 1 ? CLINIX_ROUTES.app : roleHome(role));
}
