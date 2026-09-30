export const CLINIX_ROUTES = {
  landing: "/clinix-ph",
  auth: "/clinix-ph/auth",
  onboarding: "/clinix-ph/onboarding",
  admin: "/clinix-ph/admin",
  app: "/clinix-ph/app",
  resetRequest: "/clinix-ph/auth/reset",
  resetConfirm: "/clinix-ph/auth/reset/confirm",
} as const;

// Production serves Clinix on its own subdomain (set NEXT_PUBLIC_CLINIX_URL);
// unset — e.g. local dev — links stay on this server's /clinix-ph route.
export const CLINIX_URL = process.env.NEXT_PUBLIC_CLINIX_URL || CLINIX_ROUTES.landing;

export const COMPANY_ADMIN_ROUTE = "/admin";

export const CONSOLE_THEME_COOKIE = "console-theme";
export const CONSOLE_THEMES = ["dark", "light"] as const;
export type ConsoleTheme = (typeof CONSOLE_THEMES)[number];

export const TRIAL_DAYS = 15;
// Client-side pause between resends; the server's own limit is 3 per hour per email.
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const STAFF_INVITE_TTL_DAYS = 7;

// Tenants live at <subdomain>.databridgesol.space (docs/healthbridge-plan.md, section 1).
export const CLINIC_DOMAIN_SUFFIX = ".databridgesol.space";

// Plan section 4: reserved words a clinic can't claim as its subdomain. Beyond
// the generic ones, this must hold every name already in use on the shared
// domain: another product's host (nlminventory) and the labels Resend's DKIM
// and bounce records live on (`resend._domainkey`, `send`) — a clinic that
// registered one of those would be handed a hostname that is not its own.
export const RESERVED_SUBDOMAINS = [
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "cdn",
  "clinix",
  "dashboard",
  "demo",
  "dev",
  "docs",
  "ftp",
  "help",
  "hq",
  "imap",
  "inbound",
  "login",
  "mail",
  "nlminventory",
  "ns1",
  "ns2",
  "pop",
  "portal",
  "pos",
  "register",
  "resend",
  "send",
  "signup",
  "smtp",
  "staging",
  "static",
  "status",
  "support",
  "test",
  "www",
] as const;

export const SPECIALTIES = ["dental", "vet", "eye", "derma"] as const;

export const FONT_PAIRINGS = ["modern", "classic", "friendly", "luxury"] as const;

export const INVITABLE_STAFF_ROLES = ["practitioner", "assistant"] as const;

export const SOCIAL_PROVIDERS = ["google", "apple", "facebook"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const REPORT_RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
] as const;
