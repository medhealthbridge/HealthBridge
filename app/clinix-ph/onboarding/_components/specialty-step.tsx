import { SPECIALTIES } from "@/src/lib/constants";
import { SPECIALTY_OPTIONS } from "../_data";
import type { StepProps } from "./step-props";
import { StepHeading } from "./step-heading";

export function SpecialtyStep({ values, onChange }: StepProps) {
  const selected = SPECIALTY_OPTIONS[values.specialty];

  return (
    <>
      <StepHeading>What kind of clinic is this?</StepHeading>
      <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2">
        {SPECIALTIES.map((key) => {
          const option = SPECIALTY_OPTIONS[key];
          const isSelected = values.specialty === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange({ specialty: key })}
              className={`min-h-11 cursor-pointer rounded-[10px] border p-3.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                isSelected ? "border-brand bg-brand/10" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <span className="block font-display text-sm font-extrabold">{option.label}</span>
              <span className="block text-xs text-slate-600">{option.summary}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5 rounded-[10px] border border-slate-200 bg-white p-3">
        <span className="text-[10px] tracking-widest text-brand uppercase">
          Custom fields included for {selected.label}
        </span>
        <ul className="flex flex-col gap-1 text-sm">
          {selected.fields.map((field) => (
            <li key={field} className="before:mr-1.5 before:content-['•']">
              {field}
            </li>
          ))}
        </ul>
        <span className="text-xs text-slate-600">
          Added automatically to patient records — you can adjust these later in Settings.
        </span>
      </div>
    </>
  );
}
