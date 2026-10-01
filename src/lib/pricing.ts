/**
 * Amounts the onboarding checkout charges, all in PHP centavos so money is
 * never a float. The plan figure mirrors the landing page's base price
 * (components/clinix-landing.tsx); keep the two in step.
 */
export const PLAN_FIRST_MONTH_CENTAVOS = 1490 * 100;

export const DOMAIN_YEARS = 1;

/** Cheap, clinic-friendly extensions offered in the picker, in display order. */
export const DOMAIN_TLDS = ["com", "net", "org", "co", "health", "clinic"] as const;

export function formatCentavos(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    centavos / 100,
  );
}
