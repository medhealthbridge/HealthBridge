import { z } from "zod";
import { SPECIALTIES } from "@/src/lib/constants";
import { subdomainSchema } from "./onboarding";

export const TENANT_TIERS = ["tier_1", "tier_2", "tier_3", "tier_4"] as const;
export const TENANT_PLANS = ["trial", "active"] as const;

/** What the company admin enters to open a client's account. */
export const newTenantSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the business name.").max(120),
  ownerName: z.string().trim().min(2, "Enter the owner's name.").max(120),
  ownerEmail: z.email("Enter a valid email address.").trim().toLowerCase(),
  subdomain: subdomainSchema,
  branchName: z.string().trim().min(2, "Enter the first branch's name.").max(120),
  branchCity: z.string().trim().min(2, "Enter the branch city.").max(80),
  specialty: z.enum(SPECIALTIES, "Choose a specialty."),
  tier: z.enum(TENANT_TIERS, "Choose a tier."),
  plan: z.enum(TENANT_PLANS, "Choose a plan."),
});

export type NewTenantInput = z.infer<typeof newTenantSchema>;
export type NewTenantField = keyof NewTenantInput;
