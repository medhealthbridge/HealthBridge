"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { requireClinicRole } from "@/src/server/auth";
import { db } from "@/src/server/db/client";
import { user } from "@/src/server/db/schema";
import { acceptWithAccount } from "@/src/server/invitee-auth";
import { NotFoundError } from "@/src/server/services/clinic-app";
import {
  AlreadyLinkedError, claimPatientInvite, createPatientInvite, emailPatientInvite, findOpenPatientInvite, linkPortalUser, releasePatientInvite,
} from "@/src/server/services/patient-portal";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { joinSchema, type JoinField } from "@/src/lib/schemas/clinic-staff";
import { invitePatientSchema, type InvitePatientField } from "@/src/lib/schemas/patient-portal";
import type { FormState } from "@/src/types/form-state";

export type InvitePatientState = FormState<InvitePatientField> & { sentTo?: string; emailed?: boolean };
export type PatientJoinState = FormState<JoinField>;

/** Owner and front desk invite a patient to the read-only portal. The patient can only view; this is the only way in. */
export async function invitePatientAction(_prev: InvitePatientState, data: FormData): Promise<InvitePatientState> {
  const { user: actor, clinic } = await requireClinicRole("owner", "assistant");
  const values = { email: String(data.get("email") ?? "") };
  const limit = await consumeRateLimit("patient-invite", actor.id, { max: 30, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many invitations in a short time. Wait a while and try again." };
  const parsed = invitePatientSchema.safeParse({ patientId: data.get("patientId"), email: values.email });
  if (!parsed.success) return { values, fieldErrors: { email: z.flattenError(parsed.error).fieldErrors.email } };
  try {
    const invite = await createPatientInvite(clinic, actor.id, parsed.data.patientId, parsed.data.email);
    const sent = await emailPatientInvite(clinic, invite);
    return { sentTo: invite.email, emailed: sent.emailed };
  } catch (error) {
    if (error instanceof AlreadyLinkedError) return { values, message: "This patient already has portal access." };
    if (error instanceof NotFoundError) return { values, message: "That patient could not be found." };
    throw error;
  }
}

const INVALID_LINK = "This link is no longer valid. Ask the clinic to send a new one.";

/** Public: the emailed single-use token is the credential. The invite is claimed before anything is created. */
export async function acceptPatientInviteAction(_prev: PatientJoinState, data: FormData): Promise<PatientJoinState> {
  const parsed = joinSchema.safeParse({ token: data.get("token"), name: data.get("name") ?? "", password: data.get("password") });
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return fieldErrors.name || fieldErrors.password ? { fieldErrors } : { message: INVALID_LINK };
  }
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = await consumeRateLimit("patient-invite-accept", ip, { max: 10, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many attempts. Try again in a while." };

  const invite = await findOpenPatientInvite(parsed.data.token);
  if (!invite) return { message: INVALID_LINK };
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1);
  if (!existing && parsed.data.name.length < 2) return { fieldErrors: { name: ["Enter your full name."] } };

  const claimed = await claimPatientInvite(parsed.data.token);
  if (!claimed) return { message: INVALID_LINK };
  try {
    await acceptWithAccount({
      email: invite.email,
      name: parsed.data.name,
      password: parsed.data.password,
      existingUserId: existing?.id,
      headers: requestHeaders,
      grant: (userId) => linkPortalUser(claimed.clinicId, claimed.patientId, userId),
    });
  } catch (error) {
    await releasePatientInvite(parsed.data.token);
    if (error instanceof AlreadyLinkedError) return { message: INVALID_LINK };
    if (!(error instanceof APIError)) throw error;
    return { message: existing ? "That password doesn't match your existing account." : "We couldn't create your account. Try again." };
  }
  redirect(CLINIX_ROUTES.portal);
}
