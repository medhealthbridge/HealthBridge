import { COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";
import { formatPeso } from "@/src/lib/utils";
import type {
  ActionItem,
  AuditEntry,
  ConsoleBrand,
  ConsoleNotification,
  ConsoleUser,
  DrawerAction,
  DrawerPill,
  Kpi,
  MeterRow,
  NavGroup,
  PlatformModule,
  QuickAction,
  StaffMember,
  Stat,
  Tone,
} from "@/src/types/console";

const route = (path = "") => `${COMPANY_ADMIN_ROUTE}${path}`;

export const COMPANY_BRAND: ConsoleBrand = { initial: "D", name: "DataBridgeSol", kicker: "Company admin" };
export const COMPANY_USER: ConsoleUser = { initials: "CO", name: "Founder account" };
export const COMPANY_AS_OF = "Sun 20 Sep 2026";
export const COMPANY_SEARCH_PLACEHOLDER = "Search tenants, invoices, modules…";

export const COMPANY_NAV: NavGroup[] = [
  { items: [{ href: route(), label: "Overview", icon: "overview" }] },
  {
    label: "Accounts",
    items: [
      { href: route("/tenants"), label: "Tenants", icon: "tenants", badge: "2" },
      { href: route("/billing"), label: "Billing & revenue", icon: "billing" },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: route("/modules"), label: "Module marketplace", icon: "modules" },
      { href: route("/support"), label: "Support & delivery", icon: "support", badge: "1" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: route("/staff"), label: "Company staff", icon: "staff" },
      { href: route("/feedback"), label: "Feedbacks", icon: "feedback" },
      { href: route("/audit"), label: "Audit log", icon: "audit" },
    ],
  },
];

export const COMPANY_QUICK_ACTIONS: QuickAction[] = [
  { label: "New tenant", href: route("/tenants"), toast: "Opening new tenant form" },
  { label: "Issue refund", href: route("/billing"), toast: "Opening billing" },
  { label: "Enable a module", href: route("/modules"), toast: "Opening the module marketplace" },
  { label: "Invite company staff", href: route("/staff"), toast: "Opening staff invite" },
];

export const COMPANY_NOTIFICATIONS: ConsoleNotification[] = [
  {
    kind: "Billing",
    tone: "danger",
    title: "Metro Derma Skin Clinics — payment failed again",
    body: "3rd consecutive failed charge. Masterlock is recommended.",
    when: "30 min ago",
  },
  {
    kind: "Support",
    tone: "warn",
    title: "New high-severity ticket",
    body: "Metro Derma reports card payments failing at checkout.",
    when: "2 hrs ago",
  },
  {
    kind: "Growth",
    tone: "accent",
    title: "2 trials converting this week",
    body: "PawCare and OptiPlus trials end within 7 days — no payment method on file yet.",
    when: "4 hrs ago",
  },
  {
    kind: "Platform",
    tone: "info",
    title: "Module adoption update",
    body: "Claims Manager now active on 16 of 24 paid tenants.",
    when: "Yesterday",
  },
];

export const TENANT_STATUSES = ["Active", "Trial", "Past due", "Cancelled"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const TENANT_STATUS_TONE: Record<TenantStatus, Tone> = {
  Active: "accent",
  Trial: "info",
  "Past due": "warn",
  Cancelled: "neutral",
};

export type Tenant = {
  key: string;
  name: string;
  email: string;
  tier: string;
  status: TenantStatus;
  clinics: number;
  mrr: number;
  renews: string;
};

export const TENANTS: Tenant[] = [
  { key: "bright-smile", name: "Bright Smile Dental Group", email: "ops@brightsmile.ph", tier: "Tier 2", status: "Active", clinics: 3, mrr: 2690, renews: "14 Jan 2027" },
  { key: "pawcare", name: "PawCare Veterinary Network", email: "billing@pawcare.ph", tier: "Trial", status: "Trial", clinics: 1, mrr: 0, renews: "28 Sep 2026" },
  { key: "clearview", name: "ClearView Eye Institute", email: "accounts@clearview.ph", tier: "Tier 3", status: "Active", clinics: 5, mrr: 3690, renews: "02 Mar 2027" },
  { key: "metro-derma", name: "Metro Derma Skin Clinics", email: "finance@metroderma.ph", tier: "Tier 1", status: "Past due", clinics: 2, mrr: 1490, renews: "19 Jun 2026" },
  { key: "wellsprings", name: "Wellsprings Family Medicine", email: "admin@wellsprings.ph", tier: "Enterprise", status: "Active", clinics: 9, mrr: 8200, renews: "30 Apr 2027" },
  { key: "sunrise-dental", name: "Sunrise Dental Care", email: "contact@sunrisedental.ph", tier: "Tier 1", status: "Cancelled", clinics: 1, mrr: 0, renews: "01 Aug 2026" },
  { key: "vetlink", name: "VetLink Animal Hospitals", email: "ops@vetlink.ph", tier: "Tier 4", status: "Active", clinics: 7, mrr: 4590, renews: "17 Dec 2026" },
  { key: "optiplus", name: "OptiPlus Vision Centers", email: "billing@optiplus.ph", tier: "Trial", status: "Trial", clinics: 1, mrr: 0, renews: "05 Oct 2026" },
];

export const TENANT_ACTIVITY_SUMMARY: { label: string; tone: Tone }[] = [
  { label: "18 active", tone: "accent" },
  { label: "4 trial", tone: "info" },
  { label: "2 past due", tone: "danger" },
];

export const TENANT_DRAWER_EVENTS: Omit<AuditEntry, "by">[] = [
  { action: "invoice_paid", tone: "accent", meta: "Monthly invoice settled via card", when: "2 weeks ago" },
  { action: "module_enabled", tone: "info", meta: "Claims Manager enabled", when: "1 month ago" },
  { action: "tier_changed", tone: "neutral", meta: "Upgraded from Tier 1", when: "2 months ago" },
];

export const TENANT_DRAWER_MODULES = "4 of 6";

export function tenantDrawerActions(name: string): DrawerAction[] {
  return [
    { label: "Change tier", variant: "primary", toast: `Opening tier change for ${name}` },
    { label: "Issue refund", variant: "secondary", toast: `Opening refund for ${name}` },
    { label: "Masterlock", variant: "danger", toast: `Masterlock confirmation for ${name}` },
  ];
}

export function tenantDrawerPills(tenant: Tenant): DrawerPill[] {
  return [
    { label: tenant.tier, tone: "neutral" },
    { label: tenant.status, tone: TENANT_STATUS_TONE[tenant.status] },
    { label: `${tenant.clinics} clinics`, tone: "neutral" },
  ];
}

export const COMPANY_KPIS: Kpi[] = [
  { label: "MRR", value: formatPeso(20660), delta: "+8.4%", deltaTone: "accent", sub: "24 paying tenants", sparkTone: "accent", spark: [30, 38, 42, 40, 48, 52, 55, 58, 62, 60, 66, 70] },
  { label: "Active tenants", value: "24", delta: "+3 this month", deltaTone: "info", sub: "18 active · 4 trial · 2 past due", sparkTone: "info", spark: [40, 44, 46, 50, 48, 54, 56, 58, 60, 62, 64, 66] },
  { label: "Churn (30d)", value: "4.1%", delta: "-0.6pt", deltaTone: "accent", sub: "1 cancellation this month", sparkTone: "warn", spark: [60, 56, 58, 52, 50, 46, 48, 44, 42, 40, 38, 36] },
  { label: "Open tickets", value: "2", delta: "1 high severity", deltaTone: "danger", sub: "Avg. response time 3.2 hrs", sparkTone: "danger", spark: [20, 26, 22, 30, 24, 28, 32, 26, 34, 28, 30, 24] },
];

export const MRR_BY_TIER: MeterRow[] = [
  { name: "Enterprise", value: formatPeso(8200), pct: 40, tone: "accent" },
  { name: "Tier 4", value: formatPeso(4590), pct: 22, tone: "info" },
  { name: "Tier 3", value: formatPeso(3690), pct: 18, tone: "warn" },
  { name: "Tier 2", value: formatPeso(2690), pct: 13, tone: "neutral" },
  { name: "Tier 1", value: formatPeso(1490), pct: 7, tone: "neutral" },
];

export const NEEDS_ATTENTION: ActionItem[] = [
  { title: "Metro Derma Skin Clinics", detail: "3rd failed charge · past due", actionLabel: "Review", toast: "Masterlock flow opened" },
  { title: "PawCare Veterinary Network", detail: "Trial ends in 8 days · no card", actionLabel: "Nudge", toast: "Reminder sent to PawCare" },
  { title: "OptiPlus Vision Centers", detail: "Trial ends in 15 days · no card", actionLabel: "Nudge", toast: "Reminder sent to OptiPlus" },
];

export const COMPANY_OPS_TILES: Stat[] = [
  { label: "Avg. tenant clinics", value: "3.6", sub: "Across 24 active tenants" },
  { label: "Module adoption", value: "67%", sub: "Tenants on 3+ modules" },
  { label: "Support SLA", value: "96%", sub: "Resolved within target this month" },
];

export const BILLING_KPIS: Stat[] = [
  { label: "MRR", value: formatPeso(20660), tone: "accent", sub: "+8.4% vs last month" },
  { label: "Past due", value: formatPeso(1490), tone: "danger", sub: "1 tenant · Metro Derma" },
  { label: "Refunded (30d)", value: formatPeso(1490), tone: "warn", sub: "1 cancellation" },
  { label: "Trials converting", value: "2", tone: "info", sub: "Within the next 15 days" },
];

export const LAST_BILLING_EVENT: Record<TenantStatus, string> = {
  Active: "Renewed",
  Trial: "Trial started",
  "Past due": "Charge failed",
  Cancelled: "Renewed",
};

export const PLATFORM_MODULES: PlatformModule[] = [
  { id: "m1", name: "Dental EHR & Odontogram", code: "MOD-DEN-EHR", desc: "Tooth-level charting, treatment plans and x-ray attachments.", on: true, tenants: 14 },
  { id: "m2", name: "POS & Invoicing", code: "MOD-POS-INV", desc: "Checkout with SC/PWD discounts, BIR receipt series and thermal printing.", on: true, tenants: 24 },
  { id: "m3", name: "Smart Inventory", code: "MOD-INV-STK", desc: "Per-branch stock, expiry tracking and inter-branch transfers.", on: true, tenants: 21 },
  { id: "m4", name: "Claims Manager", code: "MOD-CLM-PH", desc: "PhilHealth and HMO claim filing, aging and resubmission.", on: true, tenants: 16 },
  { id: "m5", name: "Telehealth Consults", code: "MOD-TEL-VID", desc: "Video consults with a waiting room and billable virtual visits.", on: false, tenants: 3 },
  { id: "m6", name: "Guesthouse & Bed Booking", code: "MOD-GST-BED", desc: "Room reservations and check-in for recovery or boarding facilities.", on: false, tenants: 0 },
];

export const DELIVERY_KPIS: Stat[] = [
  { label: "Open tickets", value: "2", tone: "warn", sub: "1 high severity" },
  { label: "Avg. response", value: "3.2 hrs", sub: "Target is 4 hrs" },
  { label: "Resolved (30d)", value: "31", tone: "accent", sub: "96% within SLA" },
  { label: "CSAT", value: "4.7 / 5", tone: "accent", sub: "From 22 responses" },
];

export type SupportTicket = {
  tenant: string;
  subject: string;
  severity: "High" | "Medium" | "Low";
  status: "Open" | "Resolved";
  opened: string;
};

export const SEVERITY_TONE: Record<SupportTicket["severity"], Tone> = { High: "danger", Medium: "info", Low: "neutral" };
export const TICKET_STATUS_TONE: Record<SupportTicket["status"], Tone> = { Open: "warn", Resolved: "accent" };

export const SUPPORT_TICKETS: SupportTicket[] = [
  { tenant: "Metro Derma Skin Clinics", subject: "Card payment failing at checkout", severity: "High", status: "Open", opened: "2 hrs ago" },
  { tenant: "ClearView Eye Institute", subject: "Requesting a 5th branch on Tier 3", severity: "Low", status: "Open", opened: "5 hrs ago" },
  { tenant: "PawCare Veterinary Network", subject: "Trial extension request", severity: "Low", status: "Resolved", opened: "Yesterday" },
  { tenant: "VetLink Animal Hospitals", subject: "SMS delivery delayed for 2 branches", severity: "Medium", status: "Open", opened: "Yesterday" },
  { tenant: "Wellsprings Family Medicine", subject: "Onboarding 3 new practitioners", severity: "Low", status: "Resolved", opened: "3 days ago" },
];

export const COMPANY_STAFF: StaffMember[] = [
  { id: "u1", name: "You — Founder", email: "founder@databridgesol.space", role: "Owner", status: "Active", detail: "Today" },
  { id: "u2", name: "R. Cruz", email: "r.cruz@databridgesol.space", role: "Support lead", status: "Active", detail: "Today" },
  { id: "u3", name: "J. Santos", email: "j.santos@databridgesol.space", role: "Platform admin", status: "Active", detail: "Today" },
  { id: "u4", name: "A. Reyes", email: "a.reyes@databridgesol.space", role: "Support", status: "Invited", detail: "—" },
];

export type TenantFeedback = {
  tenant: string;
  category: string;
  categoryTone: Tone;
  message: string;
  by: string;
  when: string;
  status: "New" | "Read" | "Resolved";
};

export const FEEDBACK_STATUS_TONE: Record<TenantFeedback["status"], Tone> = { New: "warn", Read: "neutral", Resolved: "accent" };

export const TENANT_FEEDBACK: TenantFeedback[] = [
  { tenant: "Bright Smile Dental Group", category: "Feature request", categoryTone: "info", message: "Can we get a recall SMS for 6-month dental checkups? Doing this manually right now.", by: "owner@brightsmile.ph", when: "1 hr ago", status: "New" },
  { tenant: "ClearView Eye Institute", category: "Bug report", categoryTone: "danger", message: "Lens stock count doesn’t update after a transfer between branches.", by: "accounts@clearview.ph", when: "5 hrs ago", status: "New" },
  { tenant: "VetLink Animal Hospitals", category: "General feedback", categoryTone: "neutral", message: "Love the new queue screen — much faster for the front desk.", by: "ops@vetlink.ph", when: "Yesterday", status: "Read" },
  { tenant: "PawCare Veterinary Network", category: "Billing question", categoryTone: "info", message: "Does the Trial tier support more than 1 branch if we upgrade mid-trial?", by: "billing@pawcare.ph", when: "2 days ago", status: "Resolved" },
  { tenant: "Wellsprings Family Medicine", category: "Feature request", categoryTone: "info", message: "Requesting a way to export claims aging as CSV for our accountant.", by: "admin@wellsprings.ph", when: "3 days ago", status: "Resolved" },
];

export const COMPANY_AUDIT: AuditEntry[] = [
  { action: "tenant_created", tone: "accent", meta: "New tenant “PawCare Veterinary Network” — 14-day trial", by: "j.santos@databridgesol.space", when: "20 Sep · 08:12" },
  { action: "masterlock_engaged", tone: "danger", meta: "Metro Derma Skin Clinics locked — 3 consecutive failed charges", by: "j.santos@databridgesol.space", when: "19 Sep · 16:40" },
  { action: "tier_changed", tone: "info", meta: "ClearView Eye Institute Tier 2 → Tier 3", by: "r.cruz@databridgesol.space", when: "18 Sep · 11:02" },
  { action: "module_enabled", tone: "accent", meta: "Telehealth Consults enabled for Wellsprings (pilot)", by: "founder@databridgesol.space", when: "17 Sep · 09:30" },
  { action: "refund_issued", tone: "warn", meta: "Sunrise Dental Care — ₱1,490 refunded on cancellation", by: "r.cruz@databridgesol.space", when: "15 Sep · 14:18" },
];
