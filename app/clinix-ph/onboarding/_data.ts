import type {
  FONT_PAIRINGS,
  INVITABLE_STAFF_ROLES,
  SPECIALTIES,
} from "@/src/lib/constants";
import type { OnboardingInput } from "@/src/lib/schemas/onboarding";

export const STEP_LABELS = ["Clinic", "Vertical", "Branch", "Branding", "Staff", "Go live"] as const;
export const GO_LIVE_STEP = STEP_LABELS.length - 1;

export const DEFAULT_ONBOARDING_VALUES: OnboardingInput = {
  clinicName: "",
  subdomain: "",
  specialty: "dental",
  branchName: "",
  branchCity: "",
  primaryColor: "#0f766e",
  secondaryColor: "#e7d9b8",
  font: "modern",
  staffEmail: "",
  staffRole: "assistant",
};

export const SPECIALTY_OPTIONS: Record<
  (typeof SPECIALTIES)[number],
  { label: string; summary: string; fields: readonly string[] }
> = {
  dental: {
    label: "Dental",
    summary: "Odontogram, procedures",
    fields: ["Tooth / odontogram reference", "Dental arch (upper/lower)", "Material used (consumables)"],
  },
  vet: {
    label: "Veterinary",
    summary: "Pet profiles, vaccines",
    fields: ["Species / breed", "Weight", "Vaccine due date"],
  },
  eye: {
    label: "Eye care",
    summary: "Refraction, lens fitting",
    fields: ["OD / OS refraction", "Lens type", "Frame stock reference"],
  },
  derma: {
    label: "Skin / Derma",
    summary: "Treatment packages",
    fields: ["Skin type", "Package sessions remaining", "Product batch no."],
  },
};

export const SUGGESTED_PRIMARY_COLORS = ["#0f766e", "#4338ca", "#be123c", "#b45309", "#047857", "#a8791a"];
export const SUGGESTED_SECONDARY_COLORS = ["#e7d9b8", "#f4c9d2", "#f7ead2", "#cbd5e1", "#e8dcc4", "#f4f1e6"];

export const PREMIUM_COMBOS = [
  { name: "Gold & Espresso", primary: "#a8791a", secondary: "#3b2a1e" },
  { name: "Burgundy & Champagne", primary: "#7c1d3f", secondary: "#e8dcc4" },
  { name: "Emerald & Ivory", primary: "#047857", secondary: "#f4f1e6" },
  { name: "Indigo & Blush", primary: "#4338ca", secondary: "#f4c9d2" },
] as const;

// `headingFont` overrides --font-heading; undefined keeps the default
// (Plus Jakarta Sans). The var() fonts are loaded by the onboarding page.
export const FONT_OPTIONS: Record<
  (typeof FONT_PAIRINGS)[number],
  { name: string; sample: string; headingFont?: string }
> = {
  modern: { name: "Modern", sample: "Plus Jakarta Sans + Inter" },
  classic: { name: "Classic", sample: "Georgia + Inter", headingFont: "Georgia, serif" },
  friendly: { name: "Friendly", sample: "Poppins + Inter", headingFont: "var(--font-poppins)" },
  luxury: { name: "Luxury", sample: "Playfair Display + Inter", headingFont: "var(--font-playfair)" },
};

export const STAFF_ROLE_OPTIONS: readonly {
  value: (typeof INVITABLE_STAFF_ROLES)[number];
  label: string;
}[] = [
  { value: "practitioner", label: "Practitioner" },
  { value: "assistant", label: "Assistant" },
];

export const PREVIEW_APPOINTMENT = { time: "9:00 AM", patient: "Maria Santos" };
