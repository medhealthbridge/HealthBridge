import { SUGGESTED_PRIMARY_COLORS, SUGGESTED_SECONDARY_COLORS } from "../_data";
import type { StepProps } from "./step-props";
import { StepHeading } from "./step-heading";
import { ColorChoice } from "./color-choice";
import { PremiumCombos } from "./premium-combos";
import { BrandPreview } from "./brand-preview";
import { FontPairingPicker } from "./font-pairing-picker";

export function BrandingStep({ values, onChange }: StepProps) {
  return (
    <>
      <StepHeading>Make it feel like yours</StepHeading>
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2">
        <ColorChoice
          stepLabel="Step 1"
          title="Main color"
          hint="Buttons, links and highlights."
          value={values.primaryColor}
          suggestions={SUGGESTED_PRIMARY_COLORS}
          onPick={(primaryColor) => onChange({ primaryColor })}
        />
        <ColorChoice
          stepLabel="Step 2"
          title="Secondary color"
          hint="Backgrounds and supporting surfaces."
          value={values.secondaryColor}
          suggestions={SUGGESTED_SECONDARY_COLORS}
          onPick={(secondaryColor) => onChange({ secondaryColor })}
        />
      </div>
      <hr className="border-slate-200" />
      <PremiumCombos onPick={onChange} />
      <hr className="border-slate-200" />
      <BrandPreview
        clinicName={values.clinicName}
        primaryColor={values.primaryColor}
        secondaryColor={values.secondaryColor}
      />
      <FontPairingPicker value={values.font} onPick={(font) => onChange({ font })} />
    </>
  );
}
