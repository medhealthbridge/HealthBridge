import { and, asc, eq, isNull } from "drizzle-orm";
import { withAccount, withTenant } from "@/src/server/db/client";
import { accounts, clinicStaff, clinics, staffInvites, subscriptions, user } from "@/src/server/db/schema";

export type WorkspaceClinic = {
  id: string;
  accountId: string;
  name: string;
  subdomain: string;
  specialty: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  brandingPrimaryColor: string | null;
  brandingAccentColor: string | null;
  brandingFont: string | null;
  createdAt: Date;
};

export type WorkspaceSubscription = {
  tier: string;
  status: string;
  clinicSlotLimit: number;
  trialEndsAt: Date | null;
  /** Whole days left on a trial, rounded up so the last day still counts; null when not trialing. */
  trialDaysLeft: number | null;
  currentPeriodEndsAt: Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(status: string, trialEndsAt: Date | null) {
  if (status !== "trialing" || !trialEndsAt) return null;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS));
}

export type OwnerWorkspace = {
  companyName: string;
  clinics: WorkspaceClinic[];
  subscription: WorkspaceSubscription | null;
};

/**
 * Everything onboarding created, read back: the business, its clinics and its
 * plan. `clinicIds` must be the owner's own (from `requireClinicOwner`). Each
 * clinic is read inside its own tenant context and the account rows inside the
 * account's, so row-level security is what scopes every query here.
 */
export async function getOwnerWorkspace(clinicIds: string[]): Promise<OwnerWorkspace> {
  const found = await Promise.all(
    clinicIds.map((clinicId) =>
      withTenant(clinicId, async (tx) => {
        const [row] = await tx
          .select({
            id: clinics.id,
            accountId: clinics.accountId,
            name: clinics.name,
            subdomain: clinics.subdomain,
            specialty: clinics.specialty,
            address: clinics.address,
            phone: clinics.phone,
            timezone: clinics.timezone,
            brandingPrimaryColor: clinics.brandingPrimaryColor,
            brandingAccentColor: clinics.brandingAccentColor,
            brandingFont: clinics.brandingFont,
            createdAt: clinics.createdAt,
          })
          .from(clinics)
          .where(eq(clinics.id, clinicId))
          .limit(1);
        return row;
      }),
    ),
  );

  const rows = found.filter((row) => row !== undefined).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (rows.length === 0) throw new Error("No clinic found for this owner.");

  const accountId = rows[0].accountId;
  const account = await withAccount(accountId, async (tx) => {
    const [owner] = await tx.select({ companyName: accounts.companyName }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
    const [plan] = await tx
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        clinicSlotLimit: subscriptions.clinicSlotLimit,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.accountId, accountId))
      .limit(1);
    return { companyName: owner?.companyName, plan };
  });

  return {
    companyName: account.companyName ?? rows[0].name,
    clinics: rows,
    subscription: account.plan
      ? { ...account.plan, trialDaysLeft: daysLeft(account.plan.status, account.plan.trialEndsAt) }
      : null,
  };
}

export type ClinicPerson = {
  id: string;
  clinicId: string;
  name: string | null;
  email: string;
  role: "owner" | "practitioner" | "assistant";
  state: "active" | "deactivated" | "invited";
};

/** A clinic's staff plus its pending invites, as one list of people. */
export async function listClinicPeople(clinicId: string): Promise<ClinicPerson[]> {
  return withTenant(clinicId, async (tx) => {
    const members = await tx
      .select({
        id: clinicStaff.id,
        name: user.name,
        email: user.email,
        role: clinicStaff.role,
        isActive: clinicStaff.isActive,
      })
      .from(clinicStaff)
      .innerJoin(user, eq(user.id, clinicStaff.userId))
      .where(and(eq(clinicStaff.clinicId, clinicId), isNull(clinicStaff.deletedAt)))
      .orderBy(asc(clinicStaff.createdAt));

    const invites = await tx
      .select({ id: staffInvites.id, email: staffInvites.email, role: staffInvites.role })
      .from(staffInvites)
      .where(and(eq(staffInvites.clinicId, clinicId), eq(staffInvites.status, "pending")))
      .orderBy(asc(staffInvites.createdAt));

    return [
      ...members.map((member) => ({
        id: member.id,
        clinicId,
        name: member.name,
        email: member.email,
        role: member.role,
        state: member.isActive ? ("active" as const) : ("deactivated" as const),
      })),
      ...invites.map((invite) => ({
        id: invite.id,
        clinicId,
        name: null,
        email: invite.email,
        role: invite.role,
        state: "invited" as const,
      })),
    ];
  });
}
