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
