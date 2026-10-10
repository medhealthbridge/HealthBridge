/**
 * The only better-auth endpoints the outside world may call over HTTP. Everything else (sign-up, sign-in,
 * update-user, change-password, sessions, …) runs inside our Server Actions, which add their own checks:
 * the admin sign-in refuses anyone who isn't DataBridgeSol staff, sign-up only exists on the Clinix page,
 * and staff/admin accounts only come from single-use invites. Calling /api/auth/sign-up/email from Postman,
 * curl or a script therefore gets a 404, on every host.
 */
const PUBLIC: { method: "GET" | "POST"; pattern: RegExp }[] = [
  // Email links: verify the address, open a password reset (better-auth checks the token, then redirects).
  { method: "GET", pattern: /^\/verify-email$/ },
  { method: "GET", pattern: /^\/reset-password\/[^/]+$/ },
  // Social sign-in returns here. Apple posts its answer (form_post); the others redirect with GET.
  { method: "GET", pattern: /^\/callback\/(google|apple|facebook)$/ },
  { method: "POST", pattern: /^\/callback\/apple$/ },
  // better-auth's own error page, which an OAuth failure redirects to.
  { method: "GET", pattern: /^\/error$/ },
];

/** `path` is the part after /api/auth, e.g. "/sign-up/email". */
export function isPublicAuthEndpoint(method: string, path: string): boolean {
  const clean = path.replace(/\/+$/, "") || "/";
  return PUBLIC.some((rule) => rule.method === method.toUpperCase() && rule.pattern.test(clean));
}
