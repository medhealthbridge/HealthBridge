import { and, eq, isNull, sql } from "drizzle-orm";
import { withInviteToken, withTenant } from "@/src/server/db/client";
import { auditLogs, clinicStaff, clinics, staffInvites, user } from "@/src/server/db/schema";
import { clinicLinkOrigin } from "@/src/lib/clinic-host";
import { CLINIX_ROUTES, STAFF_INVITE_TTL_DAYS } from "@/src/lib/constants";
import type { StaffClinic } from "./clinic-app";
import { sendStaffInviteEmail } from "./email";
import { newSecretToken, sha256Hex } from "./tokens";

export type InvitableRole = "assistant" | "practitioner";

export class AlreadyMemberError extends Error {}
export class InviteNotFoundError extends Error {}
export class StaffNotFoundError extends Error {}
export class ProtectedStaffError extends Error {}

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

/**
 * Records an invitation for this clinic and returns the raw token for the
 * email (only its hash is stored). Inviting the same address again replaces
 * the earlier link. Someone already active at the clinic can't be invited.
 */
export async function createStaffInvite(clinic: StaffClinic, actorUserId: string, email: string, role: InvitableRole) {
  const address = email.trim().toLowerCase();
  const { token, tokenHash } = newSecretToken();
  await withTenant(clinic.id, async (tx) => {
    const [member] = await tx
      .select({ id: clinicStaff.id })
      .from(clinicStaff)
      .innerJoin(user, eq(user.id, clinicStaff.userId))
      .where(and(eq(clinicStaff.clinicId, clinic.id), eq(user.email, address), eq(clinicStaff.isActive, true), isNull(clinicStaff.deletedAt)))
      .limit(1);
    if (member) throw new AlreadyMemberError(address);

    await tx.update(staffInvites).set({ status: "revoked" }).where(and(eq(staffInvites.clinicId, clinic.id), eq(staffInvites.email, address), eq(staffInvites.status, "pending")));
    const [row] = await tx
      .insert(staffInvites)
      .values({ clinicId: clinic.id, email: address, role, invitedByStaffId: clinic.staffId, tokenHash, expiresAt: days(STAFF_INVITE_TTL_DAYS) })
      .returning({ id: staffInvites.id });
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "staff_invite", entityId: row.id, action: "create", diff: { after: { email: address, role } } });
  });
  return { token, email: address, role };
}

/** Creates the invite and emails the link. The invite stays even if the email fails, so the owner can resend. */
export async function inviteStaffAndEmail(clinic: StaffClinic, actor: { id: string; name: string }, email: string, role: InvitableRole) {
  const invite = await createStaffInvite(clinic, actor.id, email, role);
  return { ...invite, ...(await emailStaffInvite(clinic, actor.name, invite)) };
}

/** Sends the join link for an invite created moments ago (also used right after onboarding). */
export async function emailStaffInvite(clinic: Pick<StaffClinic, "name" | "subdomain">, inviterName: string, invite: { token: string; email: string; role: InvitableRole }) {
  try {
    await sendStaffInviteEmail(
      { clinicName: clinic.name, inviterName, role: invite.role, email: invite.email },
      `${clinicLinkOrigin(clinic.subdomain)}${CLINIX_ROUTES.join}?token=${encodeURIComponent(invite.token)}`,
    );
    return { emailed: true };
  } catch (error) {
    console.error("[email] staff invite failed:", error instanceof Error ? error.message : "unknown error");
    return { emailed: false };
  }
}

/** The pending invite behind a token, or null. Works before anyone is signed in. */
export async function findOpenStaffInvite(token: string) {
  const hash = sha256Hex(token);
  const invite = await withInviteToken(hash, async (tx) => {
    const [row] = await tx
      .select({ id: staffInvites.id, clinicId: staffInvites.clinicId, email: staffInvites.email, role: staffInvites.role })
      .from(staffInvites)
      .where(and(eq(staffInvites.tokenHash, hash), eq(staffInvites.status, "pending"), sql`${staffInvites.expiresAt} > now()`))
      .limit(1);
    return row ?? null;
  });
  if (!invite) return null;
  const clinicName = await withTenant(invite.clinicId, async (tx) => {
    const [row] = await tx.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, invite.clinicId)).limit(1);
    return row?.name ?? "the clinic";
  });
  return { ...invite, role: invite.role as InvitableRole | "owner", clinicName };
}

/** Single-use: only the call that flips pending → accepted gets to proceed. */
export async function claimStaffInvite(token: string) {
  const hash = sha256Hex(token);
  return withInviteToken(hash, async (tx) => {
    const [row] = await tx
      .update(staffInvites)
      .set({ status: "accepted" })
      .where(and(eq(staffInvites.tokenHash, hash), eq(staffInvites.status, "pending"), sql`${staffInvites.expiresAt} > now()`))
      .returning({ clinicId: staffInvites.clinicId, email: staffInvites.email, role: staffInvites.role });
    return row ?? null;
  });
}

export async function releaseStaffInvite(token: string) {
  const hash = sha256Hex(token);
  await withInviteToken(hash, (tx) => tx.update(staffInvites).set({ status: "pending" }).where(and(eq(staffInvites.tokenHash, hash), eq(staffInvites.status, "accepted"))));
}

/** Adds the user to the clinic with the invited role (reactivating an earlier membership). */
export async function joinClinic(clinicId: string, userId: string, role: "owner" | "assistant" | "practitioner") {
  await withTenant(clinicId, async (tx) => {
    const [existing] = await tx
      .select({ id: clinicStaff.id, role: clinicStaff.role })
      .from(clinicStaff)
      .where(and(eq(clinicStaff.clinicId, clinicId), eq(clinicStaff.userId, userId), isNull(clinicStaff.deletedAt)))
      .limit(1);
    let staffId: string;
    if (existing) {
      // An invite never changes the owner: accepting one to your own clinic would otherwise leave it with no owner.
      await tx.update(clinicStaff).set({ role: existing.role === "owner" ? "owner" : role, isActive: true, joinedAt: new Date() }).where(eq(clinicStaff.id, existing.id));
      staffId = existing.id;
    } else {
      [{ id: staffId }] = await tx.insert(clinicStaff).values({ clinicId, userId, role, joinedAt: new Date() }).returning({ id: clinicStaff.id });
    }
    await tx.insert(auditLogs).values({ clinicId, actorUserId: userId, entityType: "staff", entityId: staffId, action: "create", diff: { after: { role }, via: "invite" } });
  });
}

export async function revokeStaffInvite(clinic: StaffClinic, actorUserId: string, inviteId: string) {
  await withTenant(clinic.id, async (tx) => {
    const rows = await tx
      .update(staffInvites)
      .set({ status: "revoked" })
      .where(and(eq(staffInvites.clinicId, clinic.id), eq(staffInvites.id, inviteId), eq(staffInvites.status, "pending")))
      .returning({ id: staffInvites.id });
    if (rows.length === 0) throw new InviteNotFoundError();
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "staff_invite", entityId: inviteId, action: "delete", diff: { after: { status: "revoked" } } });
  });
}

export async function getInvite(clinicId: string, inviteId: string) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({ email: staffInvites.email, role: staffInvites.role })
      .from(staffInvites)
      .where(and(eq(staffInvites.clinicId, clinicId), eq(staffInvites.id, inviteId), eq(staffInvites.status, "pending")))
      .limit(1);
    return row ? { email: row.email, role: row.role as InvitableRole } : null;
  });
}

/** Owners can't be changed here, and nobody changes themself: that is how a clinic ends up with no owner. */
async function editableMember(tx: Parameters<Parameters<typeof withTenant>[1]>[0], clinic: StaffClinic, staffId: string) {
  const [member] = await tx
    .select({ id: clinicStaff.id, role: clinicStaff.role, userId: clinicStaff.userId })
    .from(clinicStaff)
    .where(and(eq(clinicStaff.clinicId, clinic.id), eq(clinicStaff.id, staffId), isNull(clinicStaff.deletedAt)))
    .for("update")
    .limit(1);
  if (!member) throw new StaffNotFoundError();
  if (member.role === "owner" || member.id === clinic.staffId) throw new ProtectedStaffError();
  return member;
}

export async function changeStaffRole(clinic: StaffClinic, actorUserId: string, staffId: string, role: InvitableRole) {
  await withTenant(clinic.id, async (tx) => {
    const member = await editableMember(tx, clinic, staffId);
    await tx.update(clinicStaff).set({ role }).where(eq(clinicStaff.id, member.id));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "staff", entityId: member.id, action: "update", diff: { before: { role: member.role }, after: { role } } });
  });
}

/** Deactivation keeps the row and its audit trail: access stops, records stay. */
export async function setStaffActive(clinic: StaffClinic, actorUserId: string, staffId: string, active: boolean) {
  await withTenant(clinic.id, async (tx) => {
    const member = await editableMember(tx, clinic, staffId);
    await tx.update(clinicStaff).set({ isActive: active }).where(eq(clinicStaff.id, member.id));
    await tx.insert(auditLogs).values({ clinicId: clinic.id, actorUserId, entityType: "staff", entityId: member.id, action: active ? "update" : "delete", diff: { after: { isActive: active } } });
  });
}

