import { TextField } from "@/src/components/form-controls";
import type { StepProps } from "./step-props";
import { StepHeading } from "./step-heading";

export function BranchStep({ values, errors, onChange }: StepProps) {
  return (
    <>
      <StepHeading>Your first branch</StepHeading>
      <TextField
        name="branchName"
        label="Branch name"
        placeholder="e.g. BGC Dental Studio"
        value={values.branchName}
        onChange={(event) => onChange({ branchName: event.target.value })}
        error={errors.branchName?.[0]}
      />
      <TextField
        name="branchCity"
        label="City"
        placeholder="Taguig"
        autoComplete="address-level2"
        value={values.branchCity}
        onChange={(event) => onChange({ branchCity: event.target.value })}
        error={errors.branchCity?.[0]}
      />
    </>
  );
}
