"use server";

import { z } from "zod";
import { clinicSubdomainsEnabled } from "@/src/lib/clinic-host";
import { CLINIC_DOMAIN_SUFFIX } from "@/src/lib/constants";
import { requireWorkspace } from "@/src/server/auth";
import {
  DomainUnavailableError,
  searchDomains,
  startDomainCheckout,
  UnknownProviderError,
  type DomainQuote,
} from "@/src/server/services/domain-orders";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { domainOfferConfig } from "@/src/server/services/domain-offer";

export type DomainSearchState = { quotes?: DomainQuote[]; message?: string };

const SEARCH_LIMIT = { max: 30, windowSeconds: 60 * 60 };
const CHECKOUT_LIMIT = { max: 10, windowSeconds: 60 * 60 };

export async function searchDomainsAction(query: string): Promise<DomainSearchState> {
  const { user } = await requireWorkspace();
  if (!domainOfferConfig()) return { message: "Custom domains aren't available yet." };
  const limit = await consumeRateLimit("domain-search", user.id, SEARCH_LIMIT);
  if (!limit.allowed) return { message: "Too many searches. Try again in a little while." };

  const parsed = z.string().trim().min(2).max(100).safeParse(query);
  if (!parsed.success) return { message: "Type at least two characters." };
  try {
    const quotes = await searchDomains(parsed.data);
    return quotes.length > 0 ? { quotes } : { message: "No available names found. Try another." };
  } catch (error) {
    console.error("[domains] search failed:", error instanceof Error ? error.message : "unknown error");
    return { message: "Domain search is unavailable right now. Try again shortly." };
  }
}

const checkoutSchema = z.object({ domain: z.string().trim().min(4).max(253), provider: z.string().min(1).max(20) });

export async function startDomainCheckoutAction(values: unknown): Promise<{ url?: string; message?: string }> {
  const { user, workspace } = await requireWorkspace();
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { message: "Choose a domain and a payment method." };
  const limit = await consumeRateLimit("domain-checkout", user.id, CHECKOUT_LIMIT);
  if (!limit.allowed) return { message: "Too many attempts. Try again in a little while." };

  // Onboarding creates exactly one clinic; its account is the one being billed.
  const clinic = workspace.clinics[0];
  // Built from our own config, never from the request's Host header, which a client controls.
  const origin = clinicSubdomainsEnabled() ? `https://${clinic.subdomain}${CLINIC_DOMAIN_SUFFIX}` : (process.env.BETTER_AUTH_URL ?? "");
  try {
    const { url } = await startDomainCheckout({
      actorUserId: user.id,
      accountId: clinic.accountId,
      clinicId: clinic.id,
      domain: parsed.data.domain,
      providerId: parsed.data.provider,
      customerEmail: user.email,
      origin,
    });
    return { url };
  } catch (error) {
    if (error instanceof DomainUnavailableError) return { message: "That name was just taken. Pick another." };
    if (error instanceof UnknownProviderError) return { message: "That payment method isn't available." };
    console.error("[domains] checkout failed:", error instanceof Error ? error.message : "unknown error");
    return { message: "We couldn't start checkout. Nothing was charged. Try again." };
  }
}
