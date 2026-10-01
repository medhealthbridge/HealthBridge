import { and, eq, not, like } from "drizzle-orm";
import { db, withTenant } from "@/src/server/db/client";
import { domainLookups } from "@/src/server/db/schema";
import { CLINIC_DOMAIN_SUFFIX } from "@/src/lib/constants";

/**
 * The clinic that owns a custom domain, or null. A row exists only once a
 * domain was paid for and attached (domain-orders.ts), so a hit means verified.
 */
export async function clinicIdForCustomDomain(host: string) {
  const hostname = host.split(":")[0].toLowerCase();
  const [row] = await db
    .select({ clinicId: domainLookups.clinicId })
    .from(domainLookups)
    .where(eq(domainLookups.domain, hostname))
    .limit(1);
  return row?.clinicId ?? null;
}

/** The clinic's own domain (not its shared subdomain), if it has bought one. */
export async function customDomainOf(clinicId: string) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({ domain: domainLookups.domain })
      .from(domainLookups)
      .where(and(eq(domainLookups.clinicId, clinicId), not(like(domainLookups.domain, `%${CLINIC_DOMAIN_SUFFIX}`))))
      .limit(1);
    return row?.domain ?? null;
  });
}
