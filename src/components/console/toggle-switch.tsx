"use client";

type ToggleSwitchProps = { checked: boolean; onChange: () => void; label: string };

export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      // 44px tap area around a 38×21 track.
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-console-accent"
    >
      <span className={`relative h-[21px] w-[38px] rounded-full transition-colors duration-150 ${checked ? "bg-console-accent" : "bg-console-line"}`}>
        <span
          className={`absolute top-[2.5px] left-[2.5px] size-4 rounded-full bg-white shadow transition-transform duration-150 ${checked ? "translate-x-[17px]" : ""}`}
        />
      </span>
    </button>
  );
}
