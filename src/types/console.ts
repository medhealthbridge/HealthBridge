/** Shared shapes for the admin consoles (company admin + clinic owner console). */

export type Tone = "accent" | "info" | "warn" | "danger" | "neutral";

export type ConsoleIconName =
  | "overview"
  | "tenants"
  | "billing"
  | "modules"
  | "support"
  | "staff"
  | "feedback"
  | "audit"
  | "patients"
  | "appointments"
  | "services"
  | "inventory"
  | "claims"
  | "reminders"
  | "subscription"
  | "import-export"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: ConsoleIconName;
  badge?: string;
};

export type NavGroup = { label?: string; items: NavItem[] };

export type ConsoleBrand = { initial: string; name: string; kicker: string };
export type ConsoleUser = { initials: string; name: string };

export type QuickAction = { label: string; href: string; toast: string };

export type ConsoleNotification = {
  kind: string;
  tone: Tone;
  title: string;
  body: string;
  when: string;
};

export type Kpi = {
  label: string;
  value: string;
  delta: string;
  deltaTone: Tone;
  sub: string;
  sparkTone: Tone;
  spark: number[];
};

export type Stat = { label: string; value: string; sub: string; tone?: Tone };

export type MeterRow = { name: string; value: string; pct: number; tone: Tone };

export type ActionItem = {
  title: string;
  detail: string;
  actionLabel: string;
  toast: string;
};

export type AuditEntry = {
  action: string;
  tone: Tone;
  meta: string;
  by: string;
  when: string;
};

export type StaffStatus = "Active" | "Invited" | "Deactivated";

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: StaffStatus;
  /** Extra column value (e.g. branch, last active). */
  detail: string;
};

export type PlatformModule = {
  id: string;
  name: string;
  code: string;
  desc: string;
  on: boolean;
  /** Tenants using it — shown on the company marketplace only. */
  tenants?: number;
};

export type DrawerPill = { label: string; tone: Tone };
export type DrawerRow = { label: string; value: string };
export type DrawerAction = { label: string; variant: "primary" | "secondary" | "danger"; toast: string };
