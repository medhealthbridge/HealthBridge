import { randomBytes, randomUUID } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { withAccountAndClinic, withPlatformAdmin } from "@/src/server/db/client";
import {
  accounts,
  auditLogs,
  clinicStaff,
  clinics,
  domainLookups,
  subscriptions,
  user,
} from "@/src/server/db/schema";
import { CLINIC_DOMAIN_SUFFIX, TRIAL_DAYS } from "@/src/lib/constants";
import type { NewTenantInput } from "@/src/lib/schemas/tenant";
import {
  daysFromNow,
  OWNER_CONSTRAINT,
  SUBDOMAIN_CONSTRAINTS,
  SubdomainTakenError,
  uniqueViolationConstraint,
  WorkspaceExistsError,
} from "./onboarding";

const SLOTS = { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4 } as const;
const PAID_PERIOD_DAYS = 30;

/**
 * Opens a client's account on their behalf: owner, billing account,
 * subscription, first branch, its subdomain and the owner's membership, in one
 * transaction. The owner has no password; the caller sends them a set-password
 * link, which is the only way in. An email that already belongs to a user is
 * reused (they keep their own login) unless it already owns an account.
 */
export async function createTenant(adminUserId: string, input: NewTenantInput) {
  const accountId = randomUUID();
  const clinicId = randomUUID();

  try {
    return await withAccountAndClinic(accountId, clinicId, async (tx) => {
      const [existing] = await tx.select({ id: user.id }).from(user).where(eq(sql`lower(${user.email})`, input.ownerEmail)).limit(1);
      let ownerId = existing?.id;
      if (!ownerId) {
        ownerId = randomBytes(16).toString("hex");
        // Verified: the admin vouches for the address, and with no password
        // set, the emailed link is the only way to use the account.
        await tx.insert(user).values({ id: ownerId, name: input.ownerName, email: input.ownerEmail, emailVerified: true });
      }

      await tx.insert(accounts).values({ id: accountId, ownerUserId: ownerId, companyName: input.companyName });
      const trial = input.plan === "trial";
      await tx.insert(subscriptions).values({
        accountId,
        tier: input.tier,
        billingInterval: "monthly",
        status: trial ? "trialing" : "active",
        clinicSlotLimit: SLOTS[input.tier],
        trialEndsAt: trial ? daysFromNow(TRIAL_DAYS) : null,
        currentPeriodEndsAt: trial ? null : daysFromNow(PAID_PERIOD_DAYS),
      });
      await tx.insert(clinics).values({
        id: clinicId,
        accountId,
        name: input.branchName,
        subdomain: input.subdomain,
        specialty: input.specialty,
        address: input.branchCity,
      });
      await tx.insert(domainLookups).values({ domain: `${input.subdomain}${CLINIC_DOMAIN_SUFFIX}`, clinicId });
      await tx.insert(clinicStaff).values({ clinicId, userId: ownerId, role: "owner", joinedAt: new Date() });
      await tx.insert(auditLogs).values({
        clinicId,
        actorUserId: adminUserId,
        entityType: "account",
        entityId: accountId,
        action: "create",
        diff: { after: { company: input.companyName, tier: input.tier, plan: input.plan, createdBy: "platform_admin" } },
      });
      return { accountId, clinicId, ownerExisted: Boolean(existing) };
    });
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint === OWNER_CONSTRAINT) throw new WorkspaceExistsError();
    if (constraint && SUBDOMAIN_CONSTRAINTS.has(constraint)) throw new SubdomainTakenError(input.subdomain);
    throw error;
  }
}

export class TierTooSmallError extends Error {}

/** Locks or unlocks a tenant's access (never deletes anything). Company admin only. */
export async function setTenantSubscriptionStatus(accountId: string, status: "masterlocked" | "active") {
  const rows = await withPlatformAdmin((tx) =>
    tx.update(subscriptions).set({ status }).where(eq(subscriptions.accountId, accountId)).returning({ id: subscriptions.id }),
  );
  if (rows.length === 0) throw new Error("No subscription for that account.");
}

/** Moves a tenant to another tier, refusing a tier with fewer clinic slots than clinics they already run. */
export async function changeTenantTier(accountId: string, tier: keyof typeof SLOTS) {
  await withPlatformAdmin(async (tx) => {
    const [{ clinicCount }] = await tx.select({ clinicCount: count() }).from(clinics).where(eq(clinics.accountId, accountId));
    if (clinicCount > SLOTS[tier]) throw new TierTooSmallError();
    const rows = await tx
      .update(subscriptions)
      .set({ tier, clinicSlotLimit: SLOTS[tier] })
      .where(eq(subscriptions.accountId, accountId))
      .returning({ id: subscriptions.id });
    if (rows.length === 0) throw new Error("No subscription for that account.");
  });
}
