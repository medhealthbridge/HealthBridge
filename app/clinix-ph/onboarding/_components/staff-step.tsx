import { SelectField, TextField } from "@/src/components/form-controls";
import { STAFF_ROLE_OPTIONS } from "../_data";
import type { StepProps } from "./step-props";
import { StepHeading } from "./step-heading";

type StaffStepProps = StepProps & { onSkip: () => void; pending: boolean };

export function StaffStep({ values, errors, onChange, onSkip, pending }: StaffStepProps) {
  return (
    <>
      <StepHeading>Invite your first staff</StepHeading>
      <TextField
        name="staffEmail"
        type="email"
        label="Email"
        placeholder="assistant@brightsmile.ph"
        autoComplete="off"
        value={values.staffEmail}
        onChange={(event) => onChange({ staffEmail: event.target.value })}
        error={errors.staffEmail?.[0]}
      />
      <SelectField
        name="staffRole"
        label="Role"
        options={STAFF_ROLE_OPTIONS}
        value={values.staffRole}
        onChange={(event) =>
          onChange({ staffRole: event.target.value as StepProps["values"]["staffRole"] })
        }
        error={errors.staffRole?.[0]}
      />
      <button
        type="button"
        onClick={onSkip}
        disabled={pending}
        className="min-h-11 cursor-pointer self-start text-sm text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        Skip for now — I&apos;ll invite staff later
      </button>
    </>
  );
}
