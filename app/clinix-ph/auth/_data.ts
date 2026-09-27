import type { SocialProvider } from "@/src/lib/constants";

export type AuthMode = "login" | "signup";

/**
 * The design ships one auth screen per role (`Clinix PH Auth Practitioner`,
 * `…Assistant`, `…Patient`). They differ only in the sub-headline, which role
 * is plain text in the switcher row, and the kicker — so this is one route
 * with `?role=`, not four pages.
 */
export const AUTH_ROLES = ["owner", "practitioner", "assistant", "patient"] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

export const AUTH_ROLE_COPY: Record<AuthRole, { label: string; loginCopy: string }> = {
  owner: { label: "Owner", loginCopy: "Log in to your clinic workspace." },
  practitioner: { label: "Practitioner", loginCopy: "Log in to your schedule, patients and earnings." },
  assistant: { label: "Assistant", loginCopy: "Log in to the front desk — queue and POS." },
  patient: { label: "Patient", loginCopy: "Log in to book visits and view your records." },
};

export function parseAuthRole(value: string | undefined): AuthRole {
  return AUTH_ROLES.find((role) => role === value) ?? "owner";
}

// The side panel invites the user to the *other* mode.
export const AUTH_SIDE_PANEL_COPY: Record<AuthMode, { headline: string; body: string; cta: string }> = {
  login: {
    headline: "New here?",
    body: "Create a clinic workspace in minutes — dental, vet, eye care or general practice.",
    cta: "Create an account",
  },
  signup: {
    headline: "Already with us?",
    body: "Log back in to your clinic workspace and pick up where you left off.",
    cta: "Log in instead",
  },
};

export const SOCIAL_PROVIDER_DISPLAY: Record<SocialProvider, { label: string; glyph: string }> = {
  google: { label: "Google", glyph: "G" },
  apple: { label: "Apple", glyph: "A" },
  facebook: { label: "Facebook", glyph: "f" },
};
