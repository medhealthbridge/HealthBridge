import type { Stat } from "@/src/types/console";
import { Kicker, Panel } from "./panel";
import { TONE_TEXT } from "./tone";

const COLUMNS = {
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const;

export function StatGrid({ stats, columns = 4 }: { stats: Stat[]; columns?: keyof typeof COLUMNS }) {
  return (
    <div className={`grid grid-cols-1 gap-2 sm:gap-3 ${COLUMNS[columns]}`}>
      {stats.map((stat) => (
        <Panel key={stat.label} className="flex flex-col gap-1.5 px-3.5 py-3">
          <Kicker>{stat.label}</Kicker>
          <span className={`font-data text-xl font-semibold tabular-nums ${TONE_TEXT[stat.tone ?? "neutral"]}`}>{stat.value}</span>
          <span className="text-[11px] text-console-subtle">{stat.sub}</span>
        </Panel>
      ))}
    </div>
  );
}
