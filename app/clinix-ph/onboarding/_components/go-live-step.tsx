import { CLINIC_DOMAIN_SUFFIX, TRIAL_DAYS } from "@/src/lib/constants";
import type { OnboardingInput } from "@/src/lib/schemas/onboarding";
import { SPECIALTY_OPTIONS } from "../_data";
import { StepHeading } from "./step-heading";

export function GoLiveStep({ values }: { values: OnboardingInput }) {
  const checklist = [
    `${values.clinicName} profile created`,
    `${SPECIALTY_OPTIONS[values.specialty].label} fields set up for patient records`,
    `${values.branchName} (${values.branchCity}) added`,
    values.staffEmail
      ? `Invite ready for ${values.staffEmail}`
      : "Staff invite skipped — add anytime",
    `Subdomain ${values.subdomain}${CLINIC_DOMAIN_SUFFIX} reserved`,
  ];

  return (
    <>
      <StepHeading>Ready to go live</StepHeading>
      <ul className="flex flex-col gap-2">
        {checklist.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 size-4 shrink-0 text-brand"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-slate-600">
        Your {TRIAL_DAYS}-day free trial starts now. No card required.
      </p>
    </>
  );
}
