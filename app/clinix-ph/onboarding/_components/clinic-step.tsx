import { TextField } from "@/src/components/form-controls";
import { CLINIC_DOMAIN_SUFFIX } from "@/src/lib/constants";
import type { StepProps } from "./step-props";
import { StepHeading } from "./step-heading";

export function ClinicStep({ values, errors, onChange }: StepProps) {
  return (
    <>
      <StepHeading>Tell us about your clinic</StepHeading>
      <TextField
        name="clinicName"
        label="Clinic / business name"
        placeholder="e.g. Bright Smile Dental"
        autoComplete="organization"
        value={values.clinicName}
        onChange={(event) => onChange({ clinicName: event.target.value })}
        error={errors.clinicName?.[0]}
      />
      <TextField
        name="subdomain"
        label="Subdomain"
        placeholder="brightsmile"
        autoCapitalize="none"
        spellCheck={false}
        value={values.subdomain}
        onChange={(event) =>
          onChange({ subdomain: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
        }
        error={errors.subdomain?.[0]}
        suffix={<span className="shrink-0 font-mono text-xs text-slate-600">{CLINIC_DOMAIN_SUFFIX}</span>}
      />
    </>
  );
}
