/** Screen-section rule: title on the left, a quiet count or status on the right. */
export function SectionHeading({ title, aside, sub }: { title: string; aside?: React.ReactNode; sub?: string }) {
  return (
    <div className="border-b-2 border-slate-200 pb-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-extrabold text-slate-900">{title}</h2>
        {aside ? <span className="text-[10px] font-semibold tracking-[0.1em] text-brand uppercase">{aside}</span> : null}
      </div>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}
