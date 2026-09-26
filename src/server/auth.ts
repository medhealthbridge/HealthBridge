import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db/client";
import { account, session, user, verification } from "./db/schema";
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

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true },
  socialProviders,
  // Lets Server Actions that call auth.api.* set the session cookie.
  plugins: [nextCookies()],
});

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Signed-in user, or a redirect to the Clinix auth page. */
export async function requireUser() {
  const current = await getSession();
  if (!current) redirect(CLINIX_ROUTES.auth);
  return current.user;
}
