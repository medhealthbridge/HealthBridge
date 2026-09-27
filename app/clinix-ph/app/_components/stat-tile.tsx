import { Kicker } from "./kicker";

export function StatTile({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl bg-white px-3 py-2.5">
      <Kicker>{label}</Kicker>
      <span className={muted ? "font-data text-[11px] text-slate-400" : "font-display text-[22px] leading-none font-extrabold tracking-tight text-slate-900"}>
        {value}
      </span>
    </div>
  );
}
