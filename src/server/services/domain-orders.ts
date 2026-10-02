import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { withAccount, withOrder, withTenant } from "@/src/server/db/client";
import { auditLogs, domainLookups, domainOrders, subscriptions, type DomainOrderStatus } from "@/src/server/db/schema";
import { CLINIC_DOMAIN_SUFFIX, CLINIX_ROUTES, RESERVED_SUBDOMAINS } from "@/src/lib/constants";
import { DOMAIN_YEARS, PLAN_FIRST_MONTH_CENTAVOS } from "@/src/lib/pricing";
import { paymentProvider } from "./payments";
import {
  attachToProject,
  buyDomain,
  candidateDomains,
  checkAvailability,
  getPriceUsd,
  normalizeDomain,
} from "./registrar";

export class DomainUnavailableError extends Error {}
export class UnknownProviderError extends Error {}

export type DomainQuote = {
  domain: string;
  priceUsd: number;
  domainCentavos: number;
  planCentavos: number;
  totalCentavos: number;
};

/** What a priced name costs the client: registrar USD → PHP at our rate, plus a margin for FX and card fees. */
function toCentavos(usd: number) {
  const rate = Number(process.env.USD_PHP_RATE ?? 60);
  const margin = Number(process.env.DOMAIN_MARGIN ?? 0.1);
  // Whole pesos, rounded up, so the charge never lands below what we pay.
  return Math.ceil(usd * rate * (1 + margin)) * 100;
}

function quoteFor(domain: string, priceUsd: number): DomainQuote {
  const domainCentavos = toCentavos(priceUsd);
  return {
    domain,
    priceUsd,
    domainCentavos,
    planCentavos: PLAN_FIRST_MONTH_CENTAVOS,
    totalCentavos: domainCentavos + PLAN_FIRST_MONTH_CENTAVOS,
  };
}

/** Available names for what the owner typed, each with its all-in price. */
export async function searchDomains(query: string): Promise<DomainQuote[]> {
  const names = candidateDomains(query).filter((name) => !name.endsWith(CLINIC_DOMAIN_SUFFIX.slice(1)));
  if (names.length === 0) return [];
  const available = (await checkAvailability(names)).filter((result) => result.available);
  const quotes = await Promise.all(
    available.map(async ({ domain }) => {
      try {
        return quoteFor(domain, await getPriceUsd(domain, DOMAIN_YEARS));
      } catch {
        return null; // a name the registrar can't price is simply not offered
      }
    }),
  );
  return quotes.filter((quote): quote is DomainQuote => quote !== null);
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

/**
 * Starts checkout for a picked domain. The price is re-read here, never taken
 * from the browser, and the clinic must already be authorised by the caller.
 */
export async function startDomainCheckout(input: {
  actorUserId: string;
  accountId: string;
  clinicId: string;
  domain: string;
  providerId: string;
  customerEmail: string;
  origin: string;
}) {
  const provider = paymentProvider(input.providerId);
  if (!provider || !provider.configured()) throw new UnknownProviderError(input.providerId);

  const domain = normalizeDomain(input.domain);
  if (!domain || (RESERVED_SUBDOMAINS as readonly string[]).includes(domain)) throw new DomainUnavailableError(input.domain);
  const [availability] = await checkAvailability([domain]);
  if (!availability?.available) throw new DomainUnavailableError(domain);
  const quote = quoteFor(domain, await getPriceUsd(domain, DOMAIN_YEARS));

  let orderId: string;
  try {
    orderId = await withTenant(input.clinicId, async (tx) => {
      const [row] = await tx
        .insert(domainOrders)
        .values({
          accountId: input.accountId,
          clinicId: input.clinicId,
          domain,
          years: DOMAIN_YEARS,
          vercelPriceUsd: quote.priceUsd.toFixed(2),
          planCentavos: quote.planCentavos,
          domainCentavos: quote.domainCentavos,
          totalCentavos: quote.totalCentavos,
          provider: provider.id,
        })
        .returning({ id: domainOrders.id });
      await tx.insert(auditLogs).values({
        clinicId: input.clinicId,
        actorUserId: input.actorUserId,
        entityType: "domain_order",
        entityId: row.id,
        action: "create",
        diff: { after: { domain, totalCentavos: quote.totalCentavos, provider: provider.id } },
      });
      return row.id;
    });
  } catch (error) {
    // Someone else already has a live order for this name.
    if (isUniqueViolation(error)) throw new DomainUnavailableError(domain);
    throw error;
  }

  const checkout = await provider.createCheckout({
    orderId,
    totalCentavos: quote.totalCentavos,
    description: `Clinix PH — first month + ${domain}`,
    lines: [
      { name: "Clinix PH — first month", centavos: quote.planCentavos },
      { name: `Domain ${domain} (1 year)`, centavos: quote.domainCentavos },
    ],
    customerEmail: input.customerEmail,
    successUrl: `${input.origin}${CLINIX_ROUTES.admin}/settings`,
    cancelUrl: `${input.origin}${CLINIX_ROUTES.admin}/settings`,
  });
  await withOrder(orderId, (tx) => tx.update(domainOrders).set({ providerRef: checkout.ref }).where(eq(domainOrders.id, orderId)));
  return { orderId, url: checkout.url, quote };
}

/** Moves an order between states only if it is still in `from`; false means someone else already did. */
async function advance(
  orderId: string,
  from: DomainOrderStatus,
  to: DomainOrderStatus,
  extra: Partial<typeof domainOrders.$inferInsert> = {},
) {
  const rows = await withOrder(orderId, (tx) =>
    tx
      .update(domainOrders)
      .set({ status: to, ...extra })
      .where(and(eq(domainOrders.id, orderId), eq(domainOrders.status, from)))
      .returning({ id: domainOrders.id }),
  );
  return rows.length > 0;
}

async function flagForReview(orderId: string, reason: string) {
  console.error(`[domains] order ${orderId} needs review: ${reason}`);
  await withOrder(orderId, (tx) =>
    tx.update(domainOrders).set({ status: "needs_review", failureReason: reason.slice(0, 500) }).where(eq(domainOrders.id, orderId)),
  );
}

/**
 * A verified, provider-confirmed payment: buy the domain, serve it, and start
 * the plan. Safe to call twice — only the call that wins the `pending_payment →
 * paid` update goes on. If anything after the money was taken fails the order
 * lands in `needs_review` (the client has paid; a person sorts out a refund or
 * a retry) rather than being retried blindly.
 */
export async function fulfillPaidOrder(orderId: string, ref: string) {
  if (!z.uuid().safeParse(orderId).success) return;
  const [order] = await withOrder(orderId, (tx) => tx.select().from(domainOrders).where(eq(domainOrders.id, orderId)).limit(1));
  if (!order || order.providerRef !== ref) return;
  const provider = paymentProvider(order.provider);
  if (!provider) return;

  const payment = await provider.confirmPaid(ref);
  if (!payment.paid) return;
  if (!(await advance(orderId, "pending_payment", "paid"))) return;
  if (payment.amountCentavos < order.totalCentavos) {
    return flagForReview(orderId, `Paid ${payment.amountCentavos} but the order is ${order.totalCentavos} centavos.`);
  }

  try {
    if (!(await advance(orderId, "paid", "purchasing"))) return;
    const [availability] = await checkAvailability([order.domain]);
    if (!availability?.available) return flagForReview(orderId, "Domain was taken before purchase.");
    const currentUsd = await getPriceUsd(order.domain, order.years);
    // The registrar refuses to buy above expectedPrice; stop first if it has moved past the margin we built in.
    if (toCentavos(currentUsd) > order.domainCentavos) return flagForReview(orderId, `Price rose to $${currentUsd}.`);

    const vercelOrderId = await buyDomain(order.domain, order.years, currentUsd);
    await attachToProject(order.domain);

    await withTenant(order.clinicId, (tx) =>
      tx.insert(domainLookups).values({ domain: order.domain, clinicId: order.clinicId }).onConflictDoNothing(),
    );
    await withAccount(order.accountId, (tx) =>
      tx
        .update(subscriptions)
        .set({
          status: "active",
          billingInterval: "monthly",
          trialEndsAt: null,
          currentPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .where(eq(subscriptions.accountId, order.accountId)),
    );
    await advance(orderId, "purchasing", "active", { vercelOrderId });
  } catch (error) {
    await flagForReview(orderId, error instanceof Error ? error.message : "unknown error");
  }
}

export async function getClinicDomainOrder(clinicId: string) {
  return withTenant(clinicId, async (tx) => {
    const [row] = await tx
      .select({ domain: domainOrders.domain, status: domainOrders.status, totalCentavos: domainOrders.totalCentavos })
      .from(domainOrders)
      .where(and(eq(domainOrders.clinicId, clinicId), isNull(domainOrders.deletedAt)))
      .orderBy(desc(domainOrders.createdAt))
      .limit(1);
    return row ?? null;
  });
}
