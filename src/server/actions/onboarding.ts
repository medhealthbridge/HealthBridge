"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/server/auth";
import { createClinicWorkspace, SubdomainTakenError } from "@/src/server/services/onboarding";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { onboardingSchema, type OnboardingField } from "@/src/lib/schemas/onboarding";
import type { FormState } from "@/src/types/form-state";

export type OnboardingState = FormState<OnboardingField> & { completed?: boolean };

export async function completeOnboardingAction(values: unknown): Promise<OnboardingState> {
  const owner = await requireUser();

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await createClinicWorkspace(owner.id, parsed.data);
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { fieldErrors: { subdomain: ["That subdomain is already taken. Try another."] } };
    }
    throw error;
  }

  revalidatePath(CLINIX_ROUTES.landing, "layout");
  return { completed: true };
}
