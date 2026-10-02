import { and, asc, desc, eq, gt } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { platformAdmins, platformInvites, user, type PlatformRole } from "@/src/server/db/schema";
import { newSecretToken, sha256Hex } from "./tokens";

const INVITE_TTL_DAYS = 7;

export class InviteInvalidError extends Error {}
export class AlreadyOnTeamError extends Error {}
export class ForbiddenChangeError extends Error {}

export type PlatformPerson = {
  key: string;
  userId: string | null;
  name: string;
  email: string;
  role: PlatformRole;
  state: "active" | "invited" | "deactivated";
  since: Date;
};

/** The whole team: members with their role, plus invites that haven't been used. */
export async function listPlatformPeople(): Promise<PlatformPerson[]> {
  const [members, invites] = await Promise.all([
    db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: platformAdmins.role,
        isActive: platformAdmins.isActive,
        since: platformAdmins.createdAt,
      })
      .from(platformAdmins)
      .innerJoin(user, eq(user.id, platformAdmins.userId))
      .orderBy(asc(platformAdmins.createdAt)),
    db
      .select({ id: platformInvites.id, email: platformInvites.email, since: platformInvites.createdAt })
      .from(platformInvites)
      .where(and(eq(platformInvites.status, "pending"), gt(platformInvites.expiresAt, new Date())))
      .orderBy(desc(platformInvites.createdAt)),
  ]);

  return [
    ...members.map((member) => ({
      key: member.userId,
      userId: member.userId,
      name: member.name,
      email: member.email,
      role: member.role,
      state: member.isActive ? ("active" as const) : ("deactivated" as const),
      since: member.since,
    })),
    ...invites.map((invite) => ({
      key: invite.id,
      userId: null,
      name: "Invited",
      email: invite.email,
      role: "staff" as const,
      state: "invited" as const,
      since: invite.since,
    })),
  ];
}

/**
 * Records an invitation and returns the raw token for the email (only its hash
 * is stored). A new invite for the same address replaces any pending one, so
 * resending invalidates the earlier link.
 */
export async function createPlatformInvite(invitedByUserId: string, email: string) {
  const address = email.trim().toLowerCase();
  const [member] = await db
    .select({ isActive: platformAdmins.isActive })
    .from(user)
    .innerJoin(platformAdmins, eq(platformAdmins.userId, user.id))
    .where(eq(user.email, address))
    .limit(1);
  if (member?.isActive) throw new AlreadyOnTeamError(address);

  const { token, tokenHash } = newSecretToken();
  await db.transaction(async (tx) => {
    await tx
      .update(platformInvites)
      .set({ status: "revoked" })
      .where(and(eq(platformInvites.email, address), eq(platformInvites.status, "pending")));
    await tx.insert(platformInvites).values({
      email: address,
      tokenHash,
      invitedByUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
  });
  return { token, email: address };
}

/** The pending, unexpired invite a token opens, or null. The raw token is never compared directly. */
export async function findOpenInvite(token: string) {
  const [invite] = await db
    .select({ id: platformInvites.id, email: platformInvites.email })
    .from(platformInvites)
    .where(
      and(
        eq(platformInvites.tokenHash, sha256Hex(token)),
        eq(platformInvites.status, "pending"),
        gt(platformInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return invite ?? null;
}

/** Single-use: only the call that flips pending → accepted gets to proceed. */
export async function claimInvite(inviteId: string) {
  const rows = await db
    .update(platformInvites)
    .set({ status: "accepted" })
    .where(and(eq(platformInvites.id, inviteId), eq(platformInvites.status, "pending")))
    .returning({ id: platformInvites.id });
  return rows.length > 0;
}

export async function releaseInvite(inviteId: string) {
  await db
    .update(platformInvites)
    .set({ status: "pending" })
    .where(and(eq(platformInvites.id, inviteId), eq(platformInvites.status, "accepted")));
}

/** Makes an existing user a team member (reactivating a deactivated one). Verified email: they held the invite link. */
export async function grantPlatformStaff(userId: string) {
  await db.transaction(async (tx) => {
    await tx.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
    await tx
      .insert(platformAdmins)
      .values({ userId, role: "staff" })
      .onConflictDoUpdate({ target: platformAdmins.userId, set: { isActive: true } });
  });
}

export async function revokePlatformInvite(inviteId: string) {
  await db
    .update(platformInvites)
    .set({ status: "revoked" })
    .where(and(eq(platformInvites.id, inviteId), eq(platformInvites.status, "pending")));
}

/** Deactivate or restore a member. The founder and yourself are never changed here. */
export async function setPlatformStaffActive(actorUserId: string, targetUserId: string, active: boolean) {
  if (actorUserId === targetUserId) throw new ForbiddenChangeError("self");
  const rows = await db
    .update(platformAdmins)
    .set({ isActive: active })
    .where(and(eq(platformAdmins.userId, targetUserId), eq(platformAdmins.role, "staff")))
    .returning({ id: platformAdmins.id });
  if (rows.length === 0) throw new ForbiddenChangeError("not a staff member");
}
