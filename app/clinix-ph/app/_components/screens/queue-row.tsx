import type { QueueEntry } from "@/src/types/clinix-app";
import { Pill } from "../pill";

/** One person (or pet) waiting. Shared by the branch home preview and the Queue tab. */
export function QueueRow({ entry, actions }: { entry: QueueEntry; actions?: React.ReactNode }) {
  return (
    <li className="flex gap-3 border-b border-slate-200 pb-3">
      <span className="w-7 shrink-0 font-display text-[15px] font-extrabold text-brand">{entry.no}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-[14.5px] leading-tight font-extrabold text-slate-900">{entry.name}</span>
        <span className="text-[11.5px] text-slate-500">{entry.sub}</span>
        <span className="text-[12.5px] text-slate-700">{entry.procedure}</span>
        {actions}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Pill tone={entry.tone}>{entry.tag}</Pill>
        <span className="text-[10.5px] text-slate-400">{entry.time}</span>
      </div>
    </li>
  );
}
