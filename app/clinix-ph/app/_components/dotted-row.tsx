/** Label … value row with a dotted leader, used by POS totals, reports and patient detail. */
export function DottedRow({ label, value, emphasis = "normal" }: { label: string; value: string; emphasis?: "normal" | "credit" | "muted" }) {
  const valueTone =
    emphasis === "credit" ? "text-brand-700" : emphasis === "muted" ? "text-slate-500" : "text-slate-900";

  return (
    <div className="flex items-baseline gap-2.5 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-slate-300" />
      <span className={`font-data tabular-nums ${valueTone}`}>{value}</span>
    </div>
  );
}
