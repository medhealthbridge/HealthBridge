import type { OnboardingField, OnboardingInput } from "@/src/lib/schemas/onboarding";

export type StepProps = {
  values: OnboardingInput;
  errors: Partial<Record<OnboardingField, string[]>>;
  onChange: (patch: Partial<OnboardingInput>) => void;
};
