import { randomBytes, randomUUID } from "node:crypto";
import { withAccountAndClinic } from "@/src/server/db/client";
import {
  accounts,
  clinicStaff,
  clinics,
  domainLookups,
  staffInvites,
  subscriptions,
} from "@/src/server/db/schema";
import { CLINIC_DOMAIN_SUFFIX, STAFF_INVITE_TTL_DAYS, TRIAL_DAYS } from "@/src/lib/constants";
import type { OnboardingInput } from "@/src/lib/schemas/onboarding";

export class SubdomainTakenError extends Error {
  constructor(subdomain: string) {
    super(`Subdomain "${subdomain}" is already taken.`);
    this.name = "SubdomainTakenError";
  }
}

const SUBDOMAIN_CONSTRAINTS = new Set(["clinics_subdomain_unique", "domain_lookups_pkey"]);

// Drizzle wraps the pg error, so look through the `cause` chain for the
// unique-violation code on one of the subdomain constraints.
function isSubdomainConflict(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    const pgError = current as Error & { code?: string; constraint?: string };
    if (pgError.code === "23505" && SUBDOMAIN_CONSTRAINTS.has(pgError.constraint ?? "")) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Creates a new owner's billing account, its trial subscription, its first
 * clinic (the "first branch"), the clinic's domain lookup, the owner's staff
 * membership and, if given, one staff invite — all in one transaction.
 * The trial starts on Tier 1 (one clinic slot), per docs/healthbridge-plan.md.
 */
export async function createClinicWorkspace(ownerUserId: string, input: OnboardingInput) {
  const accountId = randomUUID();
  const clinicId = randomUUID();

  try {
    return await withAccountAndClinic(accountId, clinicId, async (tx) => {
      await tx.insert(accounts).values({
        id: accountId,
        ownerUserId,
        companyName: input.clinicName,
      });

      await tx.insert(subscriptions).values({
        accountId,
        tier: "tier_1",
        billingInterval: "monthly",
        status: "trialing",
        clinicSlotLimit: 1,
        trialEndsAt: daysFromNow(TRIAL_DAYS),
      });

      await tx.insert(clinics).values({
        id: clinicId,
        accountId,
        name: input.branchName,
        subdomain: input.subdomain,
        specialty: input.specialty,
        address: input.branchCity,
        brandingPrimaryColor: input.primaryColor,
        brandingAccentColor: input.secondaryColor,
        brandingFont: input.font,
      });

      await tx.insert(domainLookups).values({
        domain: `${input.subdomain}${CLINIC_DOMAIN_SUFFIX}`,
        clinicId,
      });

      const [owner] = await tx
        .insert(clinicStaff)
        .values({ clinicId, userId: ownerUserId, role: "owner", joinedAt: new Date() })
        .returning({ id: clinicStaff.id });

      if (input.staffEmail) {
        await tx.insert(staffInvites).values({
          clinicId,
          email: input.staffEmail,
          role: input.staffRole,
          invitedByStaffId: owner.id,
          token: randomBytes(32).toString("base64url"),
          expiresAt: daysFromNow(STAFF_INVITE_TTL_DAYS),
        });
      }

      return { clinicId, subdomain: input.subdomain };
    });
  } catch (error) {
    if (isSubdomainConflict(error)) throw new SubdomainTakenError(input.subdomain);
    throw error;
  }
}
