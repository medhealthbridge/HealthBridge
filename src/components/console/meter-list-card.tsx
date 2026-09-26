import type { MeterRow } from "@/src/types/console";
import { Kicker, Panel } from "./panel";
import { TONE_FILL } from "./tone";

export function MeterListCard({ title, rows }: { title: string; rows: MeterRow[] }) {
  return (
    <Panel className="flex flex-col gap-3 p-3.5">
      <Kicker>{title}</Kicker>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.name} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 text-xs">
              <span className="min-w-0 flex-1">{row.name}</span>
              <span className="font-data text-console-muted tabular-nums">{row.value}</span>
              <span className="w-8 text-right font-data text-[11px] text-console-subtle tabular-nums">{row.pct}%</span>
            </div>
            <div
              role="meter"
              aria-label={row.name}
              aria-valuenow={row.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-console-panel-2"
            >
              <div className={`h-full ${TONE_FILL[row.tone]}`} style={{ width: `${row.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
