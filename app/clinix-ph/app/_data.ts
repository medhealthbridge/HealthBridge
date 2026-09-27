import type { AppRole, QueueTone } from "@/src/types/clinix-app";

/**
 * THE ARCHITECTURAL SPLIT — phone app vs owner console.
 *
 * The phone app is today's floor work: who is waiting, who gets charged, what
 * a practitioner is doing next, what a patient booked. Setup and analysis —
 * services, staff, inventory, claims, subscription, clinic settings — live in
 * the console at /clinix-ph/admin and exist in exactly one place. No screen is
 * duplicated across the two; they only cross-link (CONSOLE_LINKS below, the
 * owner's "Manage clinic" row, and the console top bar's "Clinic app" link).
 */
export const APP_TABS = {
  hq: ["hq", "reports"],
  owner: ["home", "queue", "patients", "pos"],
  assistant: ["home", "queue", "patients", "pos"],
  practitioner: ["schedule", "patients", "earnings", "me"],
  patient: ["book", "visits", "records", "me"],
} as const;

export type AppTab = (typeof APP_TABS)[keyof typeof APP_TABS][number];

export type TabDef = { tab: AppTab; label: string; icon: TabIcon };
export type TabIcon = "home" | "queue" | "patients" | "pos" | "reports" | "records" | "calendar" | "wallet" | "person" | "book";

export const TAB_DEFS: Record<AppTab, TabDef> = {
  hq: { tab: "hq", label: "HQ", icon: "home" },
  reports: { tab: "reports", label: "Reports", icon: "reports" },
  home: { tab: "home", label: "Home", icon: "home" },
  queue: { tab: "queue", label: "Queue", icon: "queue" },
  patients: { tab: "patients", label: "Patients", icon: "patients" },
  pos: { tab: "pos", label: "POS", icon: "pos" },
  schedule: { tab: "schedule", label: "Schedule", icon: "calendar" },
  earnings: { tab: "earnings", label: "Earnings", icon: "wallet" },
  me: { tab: "me", label: "Me", icon: "person" },
  book: { tab: "book", label: "Book", icon: "book" },
  visits: { tab: "visits", label: "Visits", icon: "calendar" },
  records: { tab: "records", label: "Records", icon: "records" },
};

/** The owner in HQ mode gets a different tab set from the same role. */
export function tabsFor(role: AppRole, isHq: boolean): readonly AppTab[] {
  if (role === "owner") return isHq ? APP_TABS.hq : APP_TABS.owner;
  return APP_TABS[role];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  practitioner: "Practitioner",
  assistant: "Assistant",
  patient: "Patient app",
};

/**
 * Deep links into the console. The design mocked these as `?tab=…` on a
 * single-page console; the built console routes by path, so each one points at
 * the page that actually owns that job.
 */
export const CONSOLE_LINKS = [
  { key: "services", label: "Services & pricing", href: "/clinix-ph/admin/services" },
  { key: "staff", label: "Staff & roles", href: "/clinix-ph/admin/staff" },
  { key: "inventory", label: "Inventory", href: "/clinix-ph/admin/inventory" },
  { key: "claims", label: "HMO & PhilHealth claims", href: "/clinix-ph/admin/claims" },
  { key: "sub", label: "Subscription", href: "/clinix-ph/admin/subscription" },
  { key: "settings", label: "Clinic settings", href: "/clinix-ph/admin/settings" },
] as const;

/** Tailwind classes for the pill tones the design uses on queue, record and status chips. */
export const TONE_CLASSES: Record<QueueTone, string> = {
  accent: "bg-brand/10 text-brand-700",
  neutral: "bg-slate-100 text-slate-600",
  outline: "border border-slate-300 text-slate-600",
};
