import type { FONT_PAIRINGS, SPECIALTIES } from "@/src/lib/constants";

/** Display names for the values a clinic stores as plain text. */
export const SPECIALTY_LABELS: Record<(typeof SPECIALTIES)[number], string> = {
  dental: "Dental",
  vet: "Veterinary",
  eye: "Eye care",
  derma: "Skin / Derma",
};

export const FONT_PAIRING_LABELS: Record<(typeof FONT_PAIRINGS)[number], string> = {
  modern: "Modern",
  classic: "Classic",
  friendly: "Friendly",
  luxury: "Luxury",
};

/** Looks a stored value up without trusting it to still be one we know. */
export function labelOf(labels: Record<string, string>, value: string) {
  return labels[value] ?? value;
}
