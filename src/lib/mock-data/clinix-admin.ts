import { CLINIX_ROUTES } from "@/src/lib/constants";
import { formatPeso } from "@/src/lib/utils";
import type {
  ActionItem,
  AuditEntry,
  ConsoleBrand,
  ConsoleNotification,
  ConsoleUser,
  DrawerAction,
  Kpi,
  MeterRow,
  NavGroup,
  PlatformModule,
  QuickAction,
  StaffMember,
  Stat,
  Tone,
} from "@/src/types/console";

const route = (path = "") => `${CLINIX_ROUTES.admin}${path}`;

export const CLINIX_ADMIN_BRAND: ConsoleBrand = { initial: "C", name: "Clinix PH", kicker: "Owner console" };
export const CLINIX_ADMIN_USER: ConsoleUser = { initials: "MV", name: "Dra. M. Villanueva" };
export const CLINIX_AS_OF = "Sun 20 Sep 2026";
export const CLINIX_SEARCH_PLACEHOLDER = "Search patients, invoices, services…";
export const CLINIC_VERTICAL = "Dental";

export type Branch = { key: string; name: string; initial: string };

export const BRANCHES: Branch[] = [
  { key: "bgc", name: "BGC Dental Studio", initial: "BG" },
  { key: "alabang", name: "Alabang Dental", initial: "AL" },
  { key: "ortigas", name: "Ortigas Dental", initial: "OR" },
  { key: "all", name: "All branches (HQ)", initial: "HQ" },
];

export const CLINIX_ADMIN_NAV: NavGroup[] = [
  { items: [{ href: route(), label: "Overview", icon: "overview" }] },
  {
    label: "Clinical",
    items: [
      { href: route("/patients"), label: "Patients & records", icon: "patients" },
      { href: route("/appointments"), label: "Appointments & queue", icon: "appointments" },
      { href: route("/services"), label: "Services & pricing", icon: "services" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: route("/inventory"), label: "Inventory", icon: "inventory", badge: "3" },
      { href: route("/claims"), label: "Claims & receivables", icon: "claims", badge: "2" },
      { href: route("/reminders"), label: "Reminders & delivery", icon: "reminders" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: route("/staff"), label: "Staff & roles", icon: "staff" },
      { href: route("/modules"), label: "Modules", icon: "modules" },
      { href: route("/subscription"), label: "Subscription", icon: "subscription" },
      { href: route("/import-export"), label: "Import / Export", icon: "import-export" },
      { href: route("/settings"), label: "Settings", icon: "settings" },
      { href: route("/activity"), label: "Activity log", icon: "audit" },
    ],
  },
  { label: "Help", items: [{ href: route("/feedback"), label: "Send feedback", icon: "feedback" }] },
];

export const CLINIX_QUICK_ACTIONS: QuickAction[] = [
  { label: "New patient", href: route("/patients"), toast: "Opening patient registration" },
  { label: "New invoice", href: route("/services"), toast: "Starting a new invoice" },
  { label: "Book appointment", href: route("/appointments"), toast: "Opening the booking sheet" },
  { label: "Record stock delivery", href: route("/inventory"), toast: "Opening stock intake" },
];

export const CLINIX_NOTIFICATIONS: ConsoleNotification[] = [
  { kind: "Stock", tone: "danger", title: "Composite resin A2 critical", body: "4 units left against a minimum of 12. Ortigas has 26 available for transfer.", when: "12 min ago" },
  { kind: "Claim", tone: "warn", title: "Maxicare claim denied", body: "MX-40988 (₱6,500) was returned — LOA mismatch. Resubmission is available.", when: "1 hr ago" },
  { kind: "Send", tone: "danger", title: "2 reminders failed", body: "SMS to 0906 771 2288 and Viber to 0917 333 7788 did not deliver. Retry queued.", when: "2 hrs ago" },
  { kind: "Booking", tone: "info", title: "2 requests awaiting confirmation", body: "Grace Ubaldo and one walk-in request need front-desk confirmation.", when: "3 hrs ago" },
  { kind: "Billing", tone: "accent", title: "September invoice paid", body: "INV-2026-09 for ₱3,690 was settled via GCash.", when: "Yesterday" },
];

export const CLINIX_KPIS: Kpi[] = [
  { label: "Revenue today", value: formatPeso(42600), delta: "+12%", deltaTone: "accent", sub: "vs ₱38,000 last Sunday", sparkTone: "accent", spark: [30, 44, 38, 52, 47, 61, 55, 70, 64, 78, 72, 88] },
  { label: "Queue / booked", value: "28", delta: "4 in room", deltaTone: "info", sub: "6 waiting · 18 booked today", sparkTone: "info", spark: [40, 55, 48, 62, 58, 70, 66, 52, 60, 74, 68, 80] },
  { label: "Low stock alerts", value: "3", delta: "1 critical", deltaTone: "warn", sub: "Composite resin below minimum", sparkTone: "warn", spark: [20, 24, 30, 28, 36, 42, 38, 50, 46, 58, 62, 70] },
  { label: "Claims outstanding", value: formatPeso(18500), delta: "2 denied", deltaTone: "danger", sub: "₱9,700 over 60 days", sparkTone: "danger", spark: [60, 54, 62, 58, 48, 52, 44, 50, 42, 38, 44, 36] },
];

export type QueueStatus = "In room" | "Waiting" | "Booked" | "Open";
export const QUEUE_STATUS_TONE: Record<QueueStatus, Tone> = { "In room": "info", Waiting: "warn", Booked: "neutral", Open: "neutral" };

export type QueueEntry = { time: string; ticket: string; patient: string; service: string; practitioner: string; status: QueueStatus };

export const QUEUE_SUMMARY: { label: string; tone: Tone }[] = [
  { label: "4 in room", tone: "info" },
  { label: "6 waiting", tone: "warn" },
  { label: "18 booked", tone: "neutral" },
];

export const QUEUE: QueueEntry[] = [
  { time: "9:00", ticket: "A-012", patient: "Maria Santos", service: "Root canal — session 2", practitioner: "Dr. Reyes", status: "In room" },
  { time: "9:40", ticket: "A-013", patient: "Joel Ramirez", service: "Oral prophylaxis", practitioner: "Dr. Reyes", status: "In room" },
  { time: "10:20", ticket: "A-014", patient: "Andrea Tan", service: "Fluoride + sealant", practitioner: "Dra. Villanueva", status: "Waiting" },
  { time: "10:50", ticket: "A-015", patient: "Ben Cruz", service: "Extraction · senior", practitioner: "Dr. Reyes", status: "Waiting" },
  { time: "11:30", ticket: "A-016", patient: "Grace Ubaldo", service: "Consultation", practitioner: "Dra. Villanueva", status: "Booked" },
  { time: "1:00", ticket: "A-017", patient: "Walk-in slot", service: "Open", practitioner: "—", status: "Open" },
];

export const COLLECTIONS_BY_METHOD: MeterRow[] = [
  { name: "GCash", value: formatPeso(17040), pct: 40, tone: "accent" },
  { name: "Cash", value: formatPeso(11502), pct: 27, tone: "info" },
  { name: "Card", value: formatPeso(7668), pct: 18, tone: "warn" },
  { name: "Maya", value: formatPeso(3834), pct: 9, tone: "neutral" },
  { name: "HMO / PhilHealth", value: formatPeso(2556), pct: 6, tone: "neutral" },
];

export const LOW_STOCK: ActionItem[] = [
  { title: "Composite resin A2", detail: "4 left · min 12", actionLabel: "Restock", toast: "Restock request sent · Composite resin A2" },
  { title: "Lidocaine 2% carpule", detail: "18 left · min 24", actionLabel: "Restock", toast: "Restock request sent · Lidocaine 2%" },
  { title: "Gauze pads 2x2", detail: "12 left · min 40", actionLabel: "Restock", toast: "Restock request sent · Gauze pads" },
];

export const CLINIX_OPS_TILES: Stat[] = [
  { label: "No-show rate", value: "7.4%", sub: "Down from 9.1% last month" },
  { label: "Avg. wait time", value: "11 min", sub: "Across 28 patients today" },
  { label: "Chair utilisation", value: "82%", sub: "3 of 4 chairs occupied now" },
];

export type Patient = {
  mrn: string;
  name: string;
  meta: string;
  lastVisit: string;
  plan: string;
  payor: string;
  payorTone: Tone;
  balance: number;
};

export const PATIENTS: Patient[] = [
  { mrn: "MRN-0001", name: "Maria Santos", meta: "F · 34 · 0917 555 4412", lastVisit: "14 Sep 2026", plan: "Root canal (2 of 3)", payor: "Self-pay", payorTone: "neutral", balance: 5667 },
  { mrn: "MRN-0002", name: "Joel Ramirez", meta: "M · 41 · 0918 220 8830", lastVisit: "18 Sep 2026", plan: "Prophylaxis", payor: "Maxicare", payorTone: "info", balance: 0 },
  { mrn: "MRN-0003", name: "Andrea Tan", meta: "F · 9 · 0917 004 1121", lastVisit: "02 Sep 2026", plan: "Fluoride + sealant", payor: "Self-pay", payorTone: "neutral", balance: 1200 },
  { mrn: "MRN-0004", name: "Ben Cruz", meta: "M · 58 · 0906 771 2288", lastVisit: "19 Sep 2026", plan: "Extraction", payor: "PhilHealth", payorTone: "accent", balance: 2800 },
  { mrn: "MRN-0005", name: "Grace Ubaldo", meta: "F · 45 · 0920 447 1918", lastVisit: "11 Sep 2026", plan: "Consultation", payor: "Maxicare", payorTone: "info", balance: 0 },
  { mrn: "MRN-0006", name: "Ramon Tolentino", meta: "M · 62 · 0917 333 7788", lastVisit: "08 Sep 2026", plan: "Denture fitting", payor: "Senior · SC", payorTone: "warn", balance: 9400 },
];

export const PATIENT_RECORD = {
  assigned: "Dr. P. Reyes",
  allergies: "Penicillin",
  visits: [
    { when: "14 Sep", title: "Root canal — session 2", meta: "Dr. Reyes · ₱8,500 · GCash" },
    { when: "31 Aug", title: "Root canal — session 1", meta: "Dr. Reyes · ₱8,500 · GCash" },
    { when: "18 Aug", title: "Consultation + x-ray", meta: "Dra. Villanueva · ₱800 · Cash" },
    { when: "02 Aug", title: "Oral prophylaxis", meta: "Hygienist · ₱1,500 · Card" },
  ],
};

export function patientDrawerActions(name: string): DrawerAction[] {
  return [
    { label: "New invoice", variant: "primary", toast: `Invoice started for ${name}` },
    { label: "Reschedule", variant: "secondary", toast: "Opening the calendar" },
    { label: "Send recall", variant: "secondary", toast: `Recall SMS queued for ${name}` },
  ];
}

export type PendingRequest = { id: string; patient: string; service: string; when: string };

export const PENDING_REQUESTS: PendingRequest[] = [
  { id: "p1", patient: "Grace Ubaldo", service: "Skin consult", when: "Today · 2:20 PM" },
  { id: "p2", patient: "Walk-in — R. Dizon", service: "Consultation", when: "Today · 3:00 PM" },
];

export type Service = { name: string; meta: string; price: number; volume: number; revenue: number; vatExempt: boolean };

export const SERVICES: Service[] = [
  { name: "Oral Prophylaxis", meta: "45 min · hygienist", price: 1500, volume: 42, revenue: 63000, vatExempt: false },
  { name: "Tooth Extraction", meta: "30 min · per tooth", price: 3500, volume: 21, revenue: 73500, vatExempt: false },
  { name: "Root Canal Therapy", meta: "90 min · per session", price: 8500, volume: 18, revenue: 153000, vatExempt: false },
  { name: "Dental Consultation", meta: "20 min · incl. x-ray", price: 800, volume: 66, revenue: 52800, vatExempt: true },
  { name: "Denture Fitting", meta: "60 min · per arch", price: 12000, volume: 6, revenue: 72000, vatExempt: false },
];

export type StockStatus = "Critical" | "Low" | "OK";
export const STOCK_STATUS_TONE: Record<StockStatus, Tone> = { Critical: "danger", Low: "warn", OK: "accent" };

export type InventoryItem = { item: string; sku: string; qty: number; min: number; expiry: string; lot: string; status: StockStatus };

export const INVENTORY: InventoryItem[] = [
  { item: "Composite resin A2", sku: "DEN-CR-A2", qty: 4, min: 12, expiry: "Mar 2027", lot: "LOT-2200", status: "Critical" },
  { item: "Lidocaine 2% carpule", sku: "ANE-LD-02", qty: 18, min: 24, expiry: "Nov 2026", lot: "LOT-2207", status: "Low" },
  { item: "Gauze pads 2x2", sku: "CON-GZ-22", qty: 12, min: 40, expiry: "—", lot: "LOT-2214", status: "Low" },
  { item: "Fluoride varnish", sku: "PRE-FV-01", qty: 31, min: 10, expiry: "Aug 2027", lot: "LOT-2221", status: "OK" },
  { item: "Disposable bibs", sku: "CON-BB-01", qty: 240, min: 100, expiry: "—", lot: "LOT-2228", status: "OK" },
  { item: "X-ray film packets", sku: "IMG-XF-01", qty: 56, min: 30, expiry: "Jan 2028", lot: "LOT-2235", status: "OK" },
];

export const CLAIM_KPIS: Stat[] = [
  { label: "Total outstanding", value: formatPeso(18500), sub: "Across 6 open claims" },
  { label: "Over 60 days", value: formatPeso(9700), tone: "danger", sub: "2 claims need escalation" },
  { label: "Denied", value: "2", tone: "danger", sub: "Resubmission available" },
  { label: "Collected this month", value: formatPeso(41200), tone: "accent", sub: "14 claims settled" },
];

export type ClaimStatus = "Filed" | "Overdue" | "Denied" | "Approved";
export const CLAIM_STATUS_TONE: Record<ClaimStatus, Tone> = { Filed: "info", Overdue: "warn", Denied: "danger", Approved: "accent" };

export type Claim = { id: string; payor: string; patient: string; amount: number; ageDays: number; status: ClaimStatus };

export const CLAIMS: Claim[] = [
  { id: "PH-88214", payor: "PhilHealth", patient: "Ben Cruz", amount: 2800, ageDays: 12, status: "Filed" },
  { id: "MX-41208", payor: "Maxicare", patient: "Joel Ramirez", amount: 1500, ageDays: 38, status: "Overdue" },
  { id: "MX-41109", payor: "Maxicare", patient: "Grace Ubaldo", amount: 3200, ageDays: 64, status: "Denied" },
  { id: "PH-88102", payor: "PhilHealth", patient: "Maria Santos", amount: 4100, ageDays: 21, status: "Filed" },
  { id: "IC-22087", payor: "Intellicare", patient: "Andrea Tan", amount: 900, ageDays: 7, status: "Approved" },
  { id: "MX-40988", payor: "Maxicare", patient: "Ramon Tolentino", amount: 6500, ageDays: 91, status: "Denied" },
];

export const REMINDER_KPIS: Stat[] = [
  { label: "Sent today", value: "142", sub: "SMS 88 · Viber 41 · Email 13" },
  { label: "Delivered", value: "97.2%", tone: "accent", sub: "Above the 95% target" },
  { label: "Failed", value: "4", tone: "danger", sub: "Retry queued automatically" },
  { label: "Recalls due", value: "23", tone: "warn", sub: "6-month dental recalls this week" },
];

export type DeliveryStatus = "Delivered" | "Failed" | "Queued";
export const DELIVERY_STATUS_TONE: Record<DeliveryStatus, Tone> = { Delivered: "accent", Failed: "danger", Queued: "neutral" };

export type Delivery = { channel: "SMS" | "Viber" | "Email"; to: string; template: string; status: DeliveryStatus; sent: string };

export const DELIVERIES: Delivery[] = [
  { channel: "SMS", to: "0917 555 4412", template: "Appointment reminder", status: "Delivered", sent: "08:02" },
  { channel: "Viber", to: "0918 220 8830", template: "6-month recall", status: "Delivered", sent: "08:02" },
  { channel: "SMS", to: "0906 771 2288", template: "Balance reminder", status: "Failed", sent: "08:03" },
  { channel: "Email", to: "g.ubaldo@mail.com", template: "Receipt", status: "Delivered", sent: "09:14" },
  { channel: "SMS", to: "0920 447 1918", template: "Appointment reminder", status: "Queued", sent: "—" },
  { channel: "Viber", to: "0917 333 7788", template: "Post-op check-in", status: "Failed", sent: "10:41" },
];

export const CLINIX_STAFF: StaffMember[] = [
  { id: "u1", name: "Dra. M. Villanueva", email: "owner@clinix.ph", role: "Owner", detail: "All branches", status: "Active" },
  { id: "u2", name: "Dr. Paolo Reyes", email: "p.reyes@clinix.ph", role: "Practitioner", detail: "BGC Dental", status: "Active" },
  { id: "u3", name: "Nurse Jia Fernandez", email: "jia.f@clinix.ph", role: "Assistant", detail: "BGC Dental", status: "Active" },
  { id: "u4", name: "Reception — Kim Uy", email: "kim.uy@clinix.ph", role: "Assistant", detail: "Alabang", status: "Invited" },
  { id: "u5", name: "Dr. Ana Lao", email: "a.lao@clinix.ph", role: "Practitioner", detail: "Ortigas", status: "Deactivated" },
];

export const CLINIC_MODULES: PlatformModule[] = [
  { id: "m1", name: "Dental EHR & Odontogram", code: "MOD-DEN-EHR", desc: "Tooth-level charting, treatment plans and x-ray attachments.", on: true },
  { id: "m2", name: "POS & Invoicing", code: "MOD-POS-INV", desc: "Checkout with SC/PWD discounts, BIR receipt series and thermal printing.", on: true },
  { id: "m3", name: "Smart Inventory", code: "MOD-INV-STK", desc: "Per-branch stock, expiry tracking and inter-branch transfers.", on: true },
  { id: "m4", name: "Claims Manager", code: "MOD-CLM-PH", desc: "PhilHealth and HMO claim filing, aging and resubmission.", on: true },
  { id: "m5", name: "Telehealth Consults", code: "MOD-TEL-VID", desc: "Video consults with a waiting room and billable virtual visits.", on: false },
  { id: "m6", name: "Guesthouse & Bed Booking", code: "MOD-GST-BED", desc: "Room reservations and check-in for recovery or boarding facilities.", on: false },
];

export type InvoiceStatus = "Paid" | "Refunded";
export const INVOICE_STATUS_TONE: Record<InvoiceStatus, Tone> = { Paid: "accent", Refunded: "neutral" };

export const SUBSCRIPTION_INVOICES: { id: string; period: string; amount: number; status: InvoiceStatus }[] = [
  { id: "INV-2026-09", period: "Sep 2026", amount: 3690, status: "Paid" },
  { id: "INV-2026-08", period: "Aug 2026", amount: 3690, status: "Paid" },
  { id: "INV-2026-07", period: "Jul 2026", amount: 2690, status: "Paid" },
  { id: "INV-2026-06", period: "Jun 2026", amount: 2690, status: "Paid" },
  { id: "INV-2026-05", period: "May 2026", amount: 2690, status: "Refunded" },
];

export const CURRENT_PLAN = {
  name: "Tier 3",
  price: `${formatPeso(3690)}/mo`,
  renews: "02 Mar 2027",
  branches: "3 of 6",
  seats: "5 of unlimited",
};

export type ImportKind = "patients" | "visits" | "services" | "staff" | "inventory";

export const IMPORT_KINDS: Record<ImportKind, { label: string; title: string; desc: string }> = {
  patients: { label: "Patient roster", title: "Import patient roster", desc: "Name, DOB, contact, MRN mapping · CSV or Excel" },
  visits: { label: "Historical visit records", title: "Import visit history", desc: "From a legacy system export · CSV" },
  services: { label: "Service & price list", title: "Import service & price list", desc: "Bulk-load services beyond one-by-one entry · CSV" },
  staff: { label: "Staff roster", title: "Import staff roster", desc: "Bulk-invite staff by role · CSV" },
  inventory: { label: "Inventory", title: "Import inventory", desc: "SKU, item name, on-hand qty, min threshold, expiry · CSV" },
};

export const IMPORT_CARDS: ImportKind[] = ["patients", "visits", "services", "staff"];

export const EXPORT_CARDS: { label: string; desc: string; toast: string }[] = [
  { label: "Patient records", desc: "Full patient list, this branch · CSV", toast: "Patient export queued — check your email" },
  { label: "Financial reports", desc: "Sales, claims aging, collections · CSV", toast: "Reports export queued — check your email" },
  { label: "Audit log", desc: "Every privileged action, for compliance · CSV", toast: "Audit log export queued — check your email" },
  { label: "Full data export", desc: "Everything — for cancellation or backup · ZIP", toast: "Full data export requested — you’ll get a download link by email" },
];

export type CustomField = { id: string; label: string; type: "Text" | "Select"; appliesTo: "Patients" | "Inventory" };

export const CUSTOM_FIELDS: CustomField[] = [
  { id: "cf1", label: "Tooth / odontogram reference", type: "Text", appliesTo: "Patients" },
  { id: "cf2", label: "Dental arch (upper/lower)", type: "Select", appliesTo: "Patients" },
  { id: "cf3", label: "Lot no.", type: "Text", appliesTo: "Inventory" },
];

export const FEEDBACK_CATEGORIES = ["Bug report", "Feature request", "General feedback", "Billing question"] as const;

export const CLINIX_ACTIVITY: AuditEntry[] = [
  { action: "record_viewed", tone: "neutral", meta: "Dr. Reyes opened MRN-0001 (Maria Santos)", by: "p.reyes@clinix.ph", when: "20 Sep · 09:04" },
  { action: "price_changed", tone: "info", meta: "Root Canal Therapy ₱8,000 → ₱8,500", by: "owner@clinix.ph", when: "19 Sep · 16:22" },
  { action: "discount_applied", tone: "warn", meta: "SC 20% + VAT exemption · Ben Cruz · OSCA on file", by: "kim.uy@clinix.ph", when: "19 Sep · 14:10" },
  { action: "staff_deactivated", tone: "danger", meta: "Dr. Ana Lao access revoked — records retained", by: "owner@clinix.ph", when: "18 Sep · 11:35" },
  { action: "stock_transfer", tone: "neutral", meta: "20 × Lidocaine carpule · Ortigas → BGC", by: "owner@clinix.ph", when: "18 Sep · 09:50" },
  { action: "claim_resubmitted", tone: "info", meta: "MX-40988 resubmitted with corrected LOA", by: "kim.uy@clinix.ph", when: "17 Sep · 15:02" },
  { action: "record_amended", tone: "warn", meta: "MRN-0004 allergy note amended (history kept)", by: "p.reyes@clinix.ph", when: "17 Sep · 10:18" },
  { action: "module_enabled", tone: "accent", meta: "Claims Manager turned on", by: "owner@clinix.ph", when: "15 Sep · 08:44" },
];
