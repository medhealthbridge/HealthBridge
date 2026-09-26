import { STEP_LABELS } from "../_data";

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol aria-label="Setup progress" className="flex flex-wrap justify-center gap-3.5">
      {STEP_LABELS.map((label, index) => {
        const isCurrent = index === current;
        const reached = index <= current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className={`flex items-center gap-1.5 text-xs ${
              isCurrent ? "font-bold text-brand" : "text-slate-600"
            }`}
          >
            <span
              className={`grid size-5 place-items-center rounded-full font-mono text-[10px] ${
                reached ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
