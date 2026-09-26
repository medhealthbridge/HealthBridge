"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/src/server/auth";
import {
  createClinicWorkspace,
  SubdomainTakenError,
  WorkspaceExistsError,
} from "@/src/server/services/onboarding";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { onboardingSchema, type OnboardingField } from "@/src/lib/schemas/onboarding";
import type { FormState } from "@/src/types/form-state";

export type OnboardingState = FormState<OnboardingField> & { completed?: boolean };

const ONBOARDING_RATE_LIMIT = { max: 10, windowSeconds: 60 * 60 };

export async function completeOnboardingAction(values: unknown): Promise<OnboardingState> {
  const owner = await requireUser();

  const limit = await consumeRateLimit("onboarding", owner.id, ONBOARDING_RATE_LIMIT);
  if (!limit.allowed) return { message: "Too many attempts. Wait a while and try again." };

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await createClinicWorkspace(owner.id, parsed.data);
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { fieldErrors: { subdomain: ["That subdomain is already taken. Try another."] } };
    }
    if (error instanceof WorkspaceExistsError) {
      return { message: "You already have a clinic workspace — open your console to add branches." };
    }
    throw error;
  }

  // The console is what shows the new workspace. Revalidating only it keeps
  // this page (and the wizard's go-live step) from re-rendering mid-flow.
  revalidatePath(CLINIX_ROUTES.admin, "layout");
  return { completed: true };
}
