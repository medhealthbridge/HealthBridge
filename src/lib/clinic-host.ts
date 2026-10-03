import { CLINIC_DOMAIN_SUFFIX, CLINIX_ROUTES, RESERVED_SUBDOMAINS } from "@/src/lib/constants";

/**
 * Off until the wildcard domain for tenant subdomains is attached to the
 * project and its DNS is live. Turning it on before then would send a new
 * owner to a hostname that doesn't resolve, so every place that would leave
 * the current host checks this first.
 */
export function clinicSubdomainsEnabled() {
  return process.env.CLINIC_SUBDOMAINS === "on";
}

const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * The clinic subdomain a request was made on, or null for anything else: the
 * product's own hosts (`clinix.`, `www.`), other products' hosts, preview
 * deployments and localhost. Only a single label directly under the suffix
 * counts, so `a.b.databridgesol.space` is not a tenant.
 */
export function tenantSlugFromHost(host: string | null | undefined) {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname.endsWith(CLINIC_DOMAIN_SUFFIX)) return null;

  const label = hostname.slice(0, -CLINIC_DOMAIN_SUFFIX.length);
  if (!LABEL.test(label)) return null;
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(label) ? null : label;
}

/** Where a clinic's owner console lives once subdomains are on. */
export function clinicConsoleUrl(subdomain: string) {
  return `https://${subdomain}${CLINIC_DOMAIN_SUFFIX}${CLINIX_ROUTES.admin}`;
}

/** Origin of a clinic's own host, or "" (same host) while subdomains are off. */
export function clinicAppUrl(subdomain: string) {
  return clinicSubdomainsEnabled() ? `https://${subdomain}${CLINIC_DOMAIN_SUFFIX}` : "";
}

const PRODUCT_AUTH_ORIGIN = `https://clinix${CLINIC_DOMAIN_SUFFIX}`;

/** Login always happens here; a custom domain hands the session over after it. */
export function productAuthUrl() {
  return `${PRODUCT_AUTH_ORIGIN}${CLINIX_ROUTES.auth}`;
}

/**
 * A host that is none of ours: not on the shared suffix, not a Vercel preview,
 * not localhost. Only meaningful with subdomains on (production), where a clinic
 * can own its own domain; elsewhere nothing is custom.
 */
export function isCustomHost(host: string | null | undefined) {
  if (!host || !clinicSubdomainsEnabled()) return false;
  const hostname = host.split(":")[0].toLowerCase();
  return !(
    hostname === "localhost" ||
    hostname.endsWith(CLINIC_DOMAIN_SUFFIX) ||
    hostname.endsWith(".vercel.app")
  );
}

/** The one host the company admin (`/admin`) is served from. */
export const ADMIN_HOST = `admin${CLINIC_DOMAIN_SUFFIX}`;

export function isAdminHost(host: string | null | undefined) {
  return host?.split(":")[0].toLowerCase() === ADMIN_HOST;
}

/** Absolute URL on the admin host, or the current server's own path while subdomains are off (local/preview). */
export function adminUrl(path: string) {
  return clinicSubdomainsEnabled() ? `https://${ADMIN_HOST}${path}` : `${process.env.BETTER_AUTH_URL ?? ""}${path}`;
}

/** Where a clinic's emailed links point: its own host once subdomains are live, else this server. */
export function clinicLinkOrigin(subdomain: string) {
  return clinicSubdomainsEnabled() ? `https://${subdomain}${CLINIC_DOMAIN_SUFFIX}` : (process.env.BETTER_AUTH_URL ?? "");
}
