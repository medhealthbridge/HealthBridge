import { FONT_PAIRINGS } from "@/src/lib/constants";
import type { OnboardingInput } from "@/src/lib/schemas/onboarding";
import { FONT_OPTIONS } from "../_data";

type FontPairingPickerProps = {
  value: OnboardingInput["font"];
  onPick: (font: OnboardingInput["font"]) => void;
};

export function FontPairingPicker({ value, onPick }: FontPairingPickerProps) {
  return (
    <div role="group" aria-labelledby="font-pairing-label" className="flex flex-col gap-2">
      <span id="font-pairing-label" className="text-[10px] tracking-widest text-brand uppercase">
        Font pairing
      </span>
      {FONT_PAIRINGS.map((key) => {
        const option = FONT_OPTIONS[key];
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onPick(key)}
            className={`min-h-11 cursor-pointer rounded-[10px] border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              isSelected ? "border-brand bg-brand/10" : "border-slate-200 bg-white hover:border-slate-400"
            }`}
          >
            <span
              style={option.headingFont ? { fontFamily: option.headingFont } : undefined}
              className="block font-display text-base font-extrabold"
            >
              {option.name}
            </span>
            <span className="block text-xs text-slate-600">{option.sample}</span>
          </button>
        );
      })}
    </div>
  );
}
