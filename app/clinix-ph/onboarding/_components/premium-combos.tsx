import { PREMIUM_COMBOS } from "../_data";

type PremiumCombosProps = {
  onPick: (colors: { primaryColor: string; secondaryColor: string }) => void;
};

export function PremiumCombos({ onPick }: PremiumCombosProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-bold">Suggested premium combinations</span>
      <div className="flex flex-wrap gap-2">
        {PREMIUM_COMBOS.map((combo) => (
          <button
            key={combo.name}
            type="button"
            onClick={() => onPick({ primaryColor: combo.primary, secondaryColor: combo.secondary })}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-2.5 transition-colors duration-150 hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span
              aria-hidden="true"
              style={{
                background: `linear-gradient(90deg, ${combo.secondary} 60%, ${combo.primary} 60%)`,
              }}
              className="size-5 shrink-0 rounded-full"
            />
            <span className="text-xs font-semibold">{combo.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
