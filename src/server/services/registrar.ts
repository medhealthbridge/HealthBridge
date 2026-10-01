import { z } from "zod";
import { DOMAIN_TLDS } from "@/src/lib/pricing";

const API = "https://api.vercel.com";

export class RegistrarNotConfiguredError extends Error {}
export class RegistrarError extends Error {}

function config() {
  const token = process.env.VERCEL_API_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !teamId || !projectId) throw new RegistrarNotConfiguredError("Vercel registrar env is not set.");
  return { token, teamId, projectId };
}

export function registrarConfigured() {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID);
}

async function vercel(path: string, init: { method?: string; body?: unknown } = {}) {
  const { token, teamId } = config();
  const url = new URL(`${API}${path}`);
  url.searchParams.set("teamId", teamId);
  const response = await fetch(url, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Vercel's error message describes the request, never our credentials.
    const message = (json as { error?: { message?: string } })?.error?.message ?? "no reason given";
    throw new RegistrarError(`Vercel ${init.method ?? "GET"} ${path} failed (${response.status}): ${message}`);
  }
  return json;
}

// Vercel documents prices both as bare numbers and as `{ price }`-style objects.
const money = z.union([
  z.coerce.number(),
  z.object({ price: z.coerce.number() }).transform((value) => value.price),
  z.object({ amount: z.coerce.number() }).transform((value) => value.amount),
]);

const DOMAIN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Lower-cases and strips a scheme/path/www; null when it isn't a plain registrable domain. */
export function normalizeDomain(input: string) {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  return DOMAIN.test(cleaned) ? cleaned : null;
}

/** "brightsmile" → brightsmile.com, .net …; "brightsmile.org" → just that one. */
export function candidateDomains(query: string) {
  const direct = normalizeDomain(query);
  if (direct) return [direct];
  const label = query.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 63);
  if (label.length < 2) return [];
  return DOMAIN_TLDS.map((tld) => `${label}.${tld}`);
}

export async function checkAvailability(domains: string[]) {
  const json = await vercel("/v1/registrar/domains/availability", { method: "POST", body: { domains } });
  const parsed = z.object({ results: z.array(z.object({ domain: z.string(), available: z.boolean() })) }).parse(json);
  return parsed.results;
}

/** Yearly registrar price in USD for `years`, premium names included. */
export async function getPriceUsd(domain: string, years: number) {
  const json = await vercel(`/v1/registrar/domains/${encodeURIComponent(domain)}/price?years=${years}`);
  return money.parse((json as { purchasePrice?: unknown }).purchasePrice);
}

export const registrantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  phone: z.string().regex(/^\+[1-9]\d{0,2}\.?\d+$/, "E.164, e.g. +63.9175554412"),
  address1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().length(2),
  companyName: z.string().optional(),
});

/** DataBridgeSol is the registrant of record on every domain it sells. */
function registrant() {
  const raw = process.env.DOMAIN_REGISTRANT;
  if (!raw) throw new RegistrarNotConfiguredError("DOMAIN_REGISTRANT is not set.");
  return registrantSchema.parse(JSON.parse(raw));
}

export async function buyDomain(domain: string, years: number, expectedPriceUsd: number) {
  const json = await vercel(`/v1/registrar/domains/${encodeURIComponent(domain)}/buy`, {
    method: "POST",
    body: { autoRenew: true, years, expectedPrice: expectedPriceUsd, contactInformation: registrant() },
  });
  const orderId = (json as { orderId?: unknown }).orderId;
  return typeof orderId === "string" ? orderId : null;
}

/**
 * Serves the bought domain from the app. The domain is in the same Vercel team,
 * so Vercel configures its DNS and certificate itself; www redirects to the apex.
 */
export async function attachToProject(domain: string) {
  const { projectId } = config();
  await vercel(`/v10/projects/${projectId}/domains`, { method: "POST", body: { name: domain } });
  await vercel(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: { name: `www.${domain}`, redirect: domain, redirectStatusCode: 308 },
  });
}
