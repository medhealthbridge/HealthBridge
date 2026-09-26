import { z } from "zod";
import {
  FONT_PAIRINGS,
  INVITABLE_STAFF_ROLES,
  RESERVED_SUBDOMAINS,
  SPECIALTIES,
} from "@/src/lib/constants";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Pick a valid color.");

export const onboardingSchema = z.object({
  clinicName: z.string().trim().min(2, "Enter your clinic or business name.").max(120),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters.")
    .max(40, "Use at most 40 characters.")
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Use lowercase letters, numbers and hyphens, not starting or ending with a hyphen.",
    )
    .refine(
      (value) => !(RESERVED_SUBDOMAINS as readonly string[]).includes(value),
      "That subdomain is reserved. Try another.",
    ),
  specialty: z.enum(SPECIALTIES),
  branchName: z.string().trim().min(2, "Enter a branch name.").max(120),
  branchCity: z.string().trim().min(2, "Enter the branch city.").max(80),
  primaryColor: hexColor,
  secondaryColor: hexColor,
  font: z.enum(FONT_PAIRINGS),
  staffEmail: z.union([z.literal(""), z.email("Enter a valid email address.").trim().toLowerCase()]),
  staffRole: z.enum(INVITABLE_STAFF_ROLES),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OnboardingField = keyof OnboardingInput;

// Which fields each wizard step owns, so the form can validate a step with
// the same schema the server action uses before moving on.
export const ONBOARDING_STEP_FIELDS = [
  ["clinicName", "subdomain"],
  ["specialty"],
  ["branchName", "branchCity"],
  ["primaryColor", "secondaryColor", "font"],
  ["staffEmail", "staffRole"],
] as const satisfies readonly (readonly OnboardingField[])[];
