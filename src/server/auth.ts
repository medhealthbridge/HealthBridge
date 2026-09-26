import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getIP } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { db } from "./db/client";
import { account, session, user, verification } from "./db/schema";
import { isPlatformAdmin, listActiveMemberships } from "./services/access";
import { sendVerificationEmail } from "./services/email";
import { consumeRateLimit, type RateLimitRule } from "./services/rate-limit";
import { CLINIX_ROUTES, SOCIAL_PROVIDERS } from "@/src/lib/constants";

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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    // Sent after the response so response time doesn't reveal whether the
    // address was new (sign-up answers the same way for existing emails).
    sendVerificationEmail: async ({ user, url }) => {
      after(() => sendVerificationEmail(user, url));
    },
  },
  socialProviders,
  hooks: { before: rateLimitAuthEndpoints },
  // Lets Server Actions that call auth.api.* set the session cookie.
  plugins: [nextCookies()],
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
  if (!current?.user.emailVerified) redirect(CLINIX_ROUTES.auth);
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
  if (clinicIds.length === 0) redirect(CLINIX_ROUTES.onboarding);
  return { user: current, clinicIds };
}

/** Signed-in user who hasn't created a workspace yet; owners go to their console. */
export async function requireOnboardingPending() {
  const current = await requireUser();
  if ((await ownedClinicIds(current.id)).length > 0) redirect(CLINIX_ROUTES.admin);
  return current;
}
