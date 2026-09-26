"use client";

import { useState, useTransition, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { z } from "zod";
import { completeOnboardingAction } from "@/src/server/actions/onboarding";
import { Button, buttonClassName } from "@/src/components/button";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import {
  ONBOARDING_STEP_FIELDS,
  onboardingSchema,
  type OnboardingInput,
} from "@/src/lib/schemas/onboarding";
import { DEFAULT_ONBOARDING_VALUES, FONT_OPTIONS, GO_LIVE_STEP } from "../_data";
import type { StepProps } from "./step-props";
import { StepIndicator } from "./step-indicator";
import { ClinicStep } from "./clinic-step";
import { SpecialtyStep } from "./specialty-step";
import { BranchStep } from "./branch-step";
import { BrandingStep } from "./branding-step";
import { StaffStep } from "./staff-step";
import { GoLiveStep } from "./go-live-step";

const STAFF_STEP = ONBOARDING_STEP_FIELDS.length - 1;

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingInput>(DEFAULT_ONBOARDING_VALUES);
  const [errors, setErrors] = useState<StepProps["errors"]>({});
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const onChange = (patch: Partial<OnboardingInput>) => setValues((prev) => ({ ...prev, ...patch }));

  // Same schema the Server Action uses, narrowed to the fields this step owns.
  function stepErrors(index: number, candidate: OnboardingInput) {
    const result = onboardingSchema.safeParse(candidate);
    if (result.success) return {};
    const all = z.flattenError(result.error).fieldErrors;
    return Object.fromEntries(
      ONBOARDING_STEP_FIELDS[index].filter((field) => all[field]).map((field) => [field, all[field]]),
    );
  }

  function submit(candidate: OnboardingInput) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await completeOnboardingAction(candidate);
      if (result.completed) {
        setStep(GO_LIVE_STEP);
        return;
      }
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setMessage(result.message);
      const firstInvalid = ONBOARDING_STEP_FIELDS.findIndex((fields) =>
        fields.some((field) => fieldErrors[field]),
      );
      if (firstInvalid >= 0) setStep(firstInvalid);
    });
  }

  function advance(candidate: OnboardingInput) {
    const found = stepErrors(step, candidate);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step === STAFF_STEP) submit(candidate);
    else setStep(step + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    advance(values);
  }

  function skipInvite() {
    const withoutInvite = { ...values, staffEmail: "" };
    setValues(withoutInvite);
    advance(withoutInvite);
  }

  const stepProps: StepProps = { values, errors, onChange };
  const theme = {
    "--color-brand": values.primaryColor,
    "--font-heading": FONT_OPTIONS[values.font].headingFont,
  } as CSSProperties;

  return (
    <div style={theme} className="flex w-full max-w-[560px] flex-col gap-5">
      <StepIndicator current={step} />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        {step === 0 && <ClinicStep {...stepProps} />}
        {step === 1 && <SpecialtyStep {...stepProps} />}
        {step === 2 && <BranchStep {...stepProps} />}
        {step === 3 && <BrandingStep {...stepProps} />}
        {step === 4 && <StaffStep {...stepProps} onSkip={skipInvite} pending={pending} />}
        {step === GO_LIVE_STEP && <GoLiveStep values={values} />}

        {message && (
          <p role="alert" className="text-sm text-red-700">
            {message}
          </p>
        )}

        <div className="mt-1.5 flex justify-between gap-3">
          {step === GO_LIVE_STEP ? (
            <>
              <span />
              <Link href={CLINIX_ROUTES.landing} className={buttonClassName()}>
                Finish
              </Link>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={step === 0 || pending}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              <Button type="submit" disabled={pending}>
                {step === STAFF_STEP ? (pending ? "Setting up…" : "Create workspace") : "Continue"}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
