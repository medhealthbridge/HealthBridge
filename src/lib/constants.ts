export const CLINIX_ROUTES = {
  landing: "/clinix-ph",
  auth: "/clinix-ph/auth",
  onboarding: "/clinix-ph/onboarding",
  admin: "/clinix-ph/admin",
} as const;

export const COMPANY_ADMIN_ROUTE = "/admin";

export const CONSOLE_THEME_COOKIE = "console-theme";
export const CONSOLE_THEMES = ["dark", "light"] as const;
export type ConsoleTheme = (typeof CONSOLE_THEMES)[number];

export const TRIAL_DAYS = 15;
export const STAFF_INVITE_TTL_DAYS = 7;

export const CLINIC_DOMAIN_SUFFIX = ".clinix.ph";

// Plan section 4: reserved words a clinic can't claim as its subdomain.
export const RESERVED_SUBDOMAINS = [
  "admin",
  "api",
  "app",
  "auth",
  "clinix",
  "dashboard",
  "help",
  "mail",
  "status",
  "support",
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
