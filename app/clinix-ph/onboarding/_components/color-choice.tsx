import { useId } from "react";

type ColorChoiceProps = {
  stepLabel: string;
  title: string;
  hint: string;
  value: string;
  suggestions: readonly string[];
  onPick: (hex: string) => void;
};

export function ColorChoice({ stepLabel, title, hint, value, suggestions, onPick }: ColorChoiceProps) {
  const headingId = useId();

  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div id={headingId} className="flex items-baseline gap-2">
        <span className="text-[10px] tracking-[.14em] text-slate-600 uppercase">{stepLabel}</span>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          style={{ background: value }}
          className="relative block size-11 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-slate-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
        >
          <span className="sr-only">Custom {title.toLowerCase()}</span>
          <input
            type="color"
            value={value}
            onChange={(event) => onPick(event.target.value)}
            className="absolute -inset-1.5 size-[150%] cursor-pointer opacity-0"
          />
        </label>
        {suggestions.map((hex) => {
          const isSelected = value.toLowerCase() === hex;
          return (
            <button
              key={hex}
              type="button"
              aria-pressed={isSelected}
              aria-label={`Use ${hex}`}
              title={hex}
              onClick={() => onPick(hex)}
              style={{ background: hex }}
              className={`size-11 shrink-0 cursor-pointer rounded-[10px] border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                isSelected ? "border-slate-900" : "border-transparent"
              }`}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-600">{hint}</span>
    </div>
  );
}
