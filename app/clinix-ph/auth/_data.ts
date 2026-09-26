import type { SocialProvider } from "@/src/lib/constants";

export type AuthMode = "login" | "signup";

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
