import type { Kpi } from "@/src/types/console";
import { Kicker, Panel } from "./panel";
import { Pill } from "./pill";
import { TONE_FILL } from "./tone";

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Panel key={kpi.label} className="flex flex-col gap-2 px-3.5 py-3">
          <Kicker>{kpi.label}</Kicker>
          <div className="flex items-end justify-between gap-2">
            <span className="font-data text-[21px] leading-none font-semibold tabular-nums">{kpi.value}</span>
            <Pill tone={kpi.deltaTone}>{kpi.delta}</Pill>
          </div>
          <div aria-hidden="true" className="flex h-[26px] items-end gap-0.5">
            {kpi.spark.map((height, index) => (
              <span key={index} className={`min-w-0.5 flex-1 rounded-[1.5px] ${TONE_FILL[kpi.sparkTone]}`} style={{ height: `${height}%` }} />
            ))}
          </div>
          <span className="text-[11px] text-console-subtle">{kpi.sub}</span>
        </Panel>
      ))}
    </div>
  );
}
