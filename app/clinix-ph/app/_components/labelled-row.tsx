import type { LabelledRow as LabelledRowType } from "@/src/types/clinix-app";

/** Label + hint on the left, value on the right — profile and settings lists. */
export function LabelledRow({ row }: { row: LabelledRowType }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
      <div className="min-w-0">
        <div className="font-display text-[13px] font-extrabold text-slate-900">{row.label}</div>
        {row.hint ? <div className="text-[11px] text-slate-500">{row.hint}</div> : null}
      </div>
      <div className="ml-auto text-right text-[11.5px] font-semibold text-brand">{row.value}</div>
    </div>
  );
}
