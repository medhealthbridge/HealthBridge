import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getIP } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { db } from "./db/client";
import { account, session, user, verification } from "./db/schema";
import { isPlatformAdmin, listActiveMemberships } from "./services/access";
import { describeStaffClinics } from "./services/clinic-app";
import { getOwnerWorkspace } from "./services/workspace";
import { sendPasswordResetEmail, sendVerificationEmail } from "./services/email";
import { consumeRateLimit, type RateLimitRule } from "./services/rate-limit";
import { clinicIdForCustomDomain } from "./services/custom-domains";
import { clinicSubdomainsEnabled, isCustomHost, productAuthUrl, tenantSlugFromHost } from "@/src/lib/clinic-host";
import { CLINIC_DOMAIN_SUFFIX, CLINIX_ROUTES, SOCIAL_PROVIDERS } from "@/src/lib/constants";

// A provider is offered only when both of its env vars are set, so the auth
// page never renders a button that can't complete (see .env.example).
function oauthCredentials(envPrefix: string) {
  const clientId = process.env[`${envPrefix}_CLIENT_ID`] ?? "";
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`] ?? "";
  return { clientId, clientSecret, enabled: Boolean(clientId && clientSecret) };
}

const socialProviders = {
  google: oauthCredentials("GOOGLE"),
  apple: oauthCredentials("APPLE"),
  facebook: oauthCredentials("FACEBOOK"),
};

export const enabledSocialProviders = SOCIAL_PROVIDERS.filter(
  (provider) => socialProviders[provider].enabled,
);

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

// Per-IP and per-email limits on the abuse-prone better-auth endpoints.
// Stored in Postgres so every server instance shares the count; better-auth's
// built-in limiter (memory, production-only) still covers the other routes.
const AUTH_RATE_LIMITS: Record<string, { ip: RateLimitRule; email?: RateLimitRule }> = {
  "/sign-in/email": {
    ip: { max: 30, windowSeconds: FIFTEEN_MINUTES },
    email: { max: 10, windowSeconds: FIFTEEN_MINUTES },
  },
  "/sign-up/email": { ip: { max: 5, windowSeconds: ONE_HOUR } },
  "/sign-in/social": { ip: { max: 30, windowSeconds: FIFTEEN_MINUTES } },
  "/send-verification-email": {
    ip: { max: 10, windowSeconds: ONE_HOUR },
    email: { max: 3, windowSeconds: ONE_HOUR },
  },
  "/request-password-reset": {
    ip: { max: 10, windowSeconds: ONE_HOUR },
    email: { max: 3, windowSeconds: ONE_HOUR },
  },
  "/reset-password": { ip: { max: 10, windowSeconds: FIFTEEN_MINUTES } },
};

// A `hooks.before` runs for both the HTTP routes and direct `auth.api.*`
// calls from Server Actions, so this one check covers every entry point.
const rateLimitAuthEndpoints = createAuthMiddleware(async (ctx) => {
  const rules = AUTH_RATE_LIMITS[ctx.path];
  if (!rules) return;

  const source = ctx.request ?? ctx.headers;
  const ip = (source && getIP(source, ctx.context.options)) || "unknown";
  const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";

  const results = await Promise.all([
    consumeRateLimit(`auth${ctx.path}:ip`, ip, rules.ip),
    rules.email && email ? consumeRateLimit(`auth${ctx.path}:email`, email, rules.email) : undefined,
  ]);
  for (const result of results) {
    if (result && !result.allowed) {
      throw new APIError(
        "TOO_MANY_REQUESTS",
        { code: "RATE_LIMITED", message: "Too many attempts. Try again later." },
        { "Retry-After": String(result.retryAfterSeconds) },
      );
    }
  }
});

/**
 * Runs after the response, where a rejection would otherwise vanish. The
 * message names the provider's reason and never the link, which is a token.
 */
async function deliver(kind: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    console.error(`[email] ${kind} email failed:`, error instanceof Error ? error.message : "unknown error");
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // `url` points at better-auth's own /reset-password/:token, which checks
    // the token before redirecting to the form — so an expired link never
    // reaches a password field.
    sendResetPassword: async ({ user, url }) => {
      after(() => deliver("password reset", () => sendPasswordResetEmail(user, url)));
    },
  },
  emailVerification: {
    // Off: signupAction sends explicitly, so an already-registered but still
    // unverified address (a retry, or a lost first email) gets a fresh link too.
    sendOnSignUp: false,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    // Sent after the response so response time doesn't reveal whether the
    // address was new (sign-up answers the same way for existing emails).
    sendVerificationEmail: async ({ user, url }) => {
      after(() => deliver("verification", () => sendVerificationEmail(user, url)));
    },
  },
  socialProviders,
  // Log in on clinix.databridgesol.space, land on <clinic>.databridgesol.space:
  // the session cookie has to be valid on both, so it is scoped to the shared
  // parent domain. Vercel preview URLs live on another domain, where a cookie
  // for this one would be rejected outright, hence the flag.
  ...(clinicSubdomainsEnabled() && {
    advanced: { crossSubDomainCookies: { enabled: true, domain: CLINIC_DOMAIN_SUFFIX } },
    trustedOrigins: [`https://*${CLINIC_DOMAIN_SUFFIX}`],
  }),
  hooks: { before: rateLimitAuthEndpoints },
  // Lets Server Actions that call auth.api.* set the session cookie.
  // One-time tokens carry a session from the product host to a clinic's own
  // domain, which can't share the subdomain cookie (see app/api/handoff).
  // Server-initiated only, hashed at rest, and valid for a minute.
  plugins: [oneTimeToken({ disableClientRequest: true, storeToken: "hashed", expiresIn: 1 }), nextCookies()],
});

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

const getIsPlatformAdmin = cache(isPlatformAdmin);
const getMemberships = cache(listActiveMemberships);

async function ownedClinicIds(userId: string) {
  const memberships = await getMemberships(userId);
  return memberships.filter((membership) => membership.role === "owner").map((m) => m.clinicId);
}

/** Signed-in user with a verified email, or a redirect to the Clinix auth page. */
export async function requireUser() {
  const current = await getSession();
  if (!current?.user.emailVerified) {
    // A custom domain has no login of its own: sign in on the product host, which hands the session back.
    redirect(isCustomHost((await headers()).get("host")) ? productAuthUrl() : CLINIX_ROUTES.auth);
  }
  return current.user;
}

/** DataBridgeSol staff only (a `platform_admins` row); anyone else gets a 404. */
export async function requirePlatformAdmin() {
  const current = await requireUser();
  if (!(await getIsPlatformAdmin(current.id))) notFound();
  return current;
}

/**
 * Owner of at least one active clinic, with the clinic ids they own — scope
 * every owner-console query to these. Not yet onboarded → onboarding.
 */
export async function requireClinicOwner() {
  const current = await requireUser();
  const clinicIds = await ownedClinicIds(current.id);
  if (clinicIds.length === 0) {
    // Practitioners and assistants have no console; their home is the clinic app.
    redirect((await getMemberships(current.id)).length > 0 ? CLINIX_ROUTES.app : CLINIX_ROUTES.onboarding);
  }
  return { user: current, clinicIds };
}

/**
 * The owner plus the workspace onboarding created, read once per request no
 * matter how many layouts and pages ask for it.
 */
export const requireWorkspace = cache(async () => {
  const { user, clinicIds } = await requireClinicOwner();
  return { user, workspace: await getOwnerWorkspace(clinicIds) };
});

/**
 * Any active staff member (owner, practitioner or assistant) with the clinics
 * they work at and the role they hold at each. Not on any clinic → onboarding.
 */
export const requireStaff = cache(async () => {
  const current = await requireUser();
  const memberships = await getMemberships(current.id);
  if (memberships.length === 0) redirect(CLINIX_ROUTES.onboarding);
  return { user: current, clinics: await describeStaffClinics(memberships) };
});

/**
 * The clinic this request is for: the subdomain's clinic when on one, else the
 * user's first. A subdomain they don't work at is a 404, never a fallback.
 */
export const requireActiveClinic = cache(async () => {
  const { user, clinics } = await requireStaff();
  const host = (await headers()).get("host");
  const slug = tenantSlugFromHost(host);
  const customClinicId = !slug && host && isCustomHost(host) ? await clinicIdForCustomDomain(host) : null;
  const clinic = slug
    ? clinics.find((candidate) => candidate.subdomain === slug)
    : customClinicId
      ? clinics.find((candidate) => candidate.id === customClinicId)
      : isCustomHost(host)
        ? undefined
        : clinics[0];
  if (!clinic) notFound();
  return { user, clinic, clinics };
});

/** Signed-in user who hasn't created a workspace yet; owners go to their console. */
export async function requireOnboardingPending() {
  const current = await requireUser();
  if ((await ownedClinicIds(current.id)).length > 0) redirect(CLINIX_ROUTES.admin);
  return current;
}
