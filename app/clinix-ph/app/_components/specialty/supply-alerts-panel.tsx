import { SUPPLY_ALERTS } from "@/src/lib/mock-data/clinix-app";
import type { BranchKey } from "@/src/types/clinix-app";
import { Kicker } from "../kicker";
import { Pill } from "../pill";

/**
 * Read-only "we are about to run out today" strip. Counting, par levels and
 * transfers between branches are the console's inventory page, not this.
 */
export function SupplyAlertsPanel({ branch }: { branch: BranchKey }) {
  const { title, rows } = SUPPLY_ALERTS[branch];

  return (
    <section className="border-t-2 border-slate-200 pt-2.5">
      <Kicker className="mb-2 block">{title}</Kicker>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2.5">
            <span className="min-w-0 truncate text-[13px] text-slate-700">{row.name}</span>
            <span className="ml-auto">
              <Pill tone={row.tone}>{row.note}</Pill>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
