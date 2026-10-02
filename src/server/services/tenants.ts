import { asc, eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { accounts, clinics, subscriptions, user } from "@/src/server/db/schema";
import type { TenantStatus } from "@/src/lib/mock-data/company-admin";

export type TenantClinic = { name: string; subdomain: string; specialty: string };

export type TenantRow = {
  key: string;
  name: string;
  email: string;
  tier: string;
  status: TenantStatus;
  clinics: number;
  clinicList: TenantClinic[];
  mrr: number;
  renews: string;
  joined: string;
};

/** Monthly price in pesos per tier (landing page pricing); enterprise is quoted per deal. */
const TIER_MRR: Record<string, number> = { tier_1: 1490, tier_2: 2690, tier_3: 3690, tier_4: 4590 };
const TIER_LABEL: Record<string, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
  tier_4: "Tier 4",
  enterprise: "Enterprise",
};
const STATUS: Record<string, TenantStatus> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  masterlocked: "Past due",
  canceled: "Cancelled",
};

const date = new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" });

/**
 * Every account on the platform, for the company admin only (the caller must
 * have passed `requirePlatformAdmin`). Billing data only — never patient data.
 */
export async function listTenants(): Promise<TenantRow[]> {
  const [accountRows, clinicRows] = await Promise.all([
    db
      .select({
        id: accounts.id,
        name: accounts.companyName,
        createdAt: accounts.createdAt,
        email: user.email,
        tier: subscriptions.tier,
        status: subscriptions.status,
        trialEndsAt: subscriptions.trialEndsAt,
        periodEndsAt: subscriptions.currentPeriodEndsAt,
      })
      .from(accounts)
      .innerJoin(user, eq(user.id, accounts.ownerUserId))
      .leftJoin(subscriptions, eq(subscriptions.accountId, accounts.id))
      .orderBy(asc(accounts.companyName)),
    db
      .select({ accountId: clinics.accountId, name: clinics.name, subdomain: clinics.subdomain, specialty: clinics.specialty })
      .from(clinics)
      .orderBy(asc(clinics.createdAt)),
  ]);

  return accountRows.map((row) => {
    const status = STATUS[row.status ?? ""] ?? "Cancelled";
    const list = clinicRows.filter((clinic) => clinic.accountId === row.id);
    const renewsAt = status === "Trial" ? row.trialEndsAt : row.periodEndsAt;
    return {
      key: row.id,
      name: row.name,
      email: row.email,
      tier: status === "Trial" ? "Trial" : (TIER_LABEL[row.tier ?? ""] ?? "—"),
      status,
      clinics: list.length,
      clinicList: list.map(({ name, subdomain, specialty }) => ({ name, subdomain, specialty })),
      mrr: status === "Active" ? (TIER_MRR[row.tier ?? ""] ?? 0) : 0,
      renews: renewsAt ? date.format(renewsAt) : "—",
      joined: date.format(row.createdAt),
    };
  });
}
