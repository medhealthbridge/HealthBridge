import type { AuditEntry } from "@/src/types/console";
import { Panel } from "./panel";
import { Pill } from "./pill";

export function AuditLogList({ entries }: { entries: AuditEntry[] }) {
  return (
    <Panel>
      <ul>
        {entries.map((entry) => (
          <li key={`${entry.action}-${entry.when}`} className="flex items-start gap-3 border-b border-console-line px-3.5 py-3 last:border-b-0">
            <Pill tone={entry.tone} className="font-data">
              {entry.action}
            </Pill>
            <div className="min-w-0 flex-1">
              <p className="text-[13px]">{entry.meta}</p>
              <p className="mt-0.5 font-data text-[11px] text-console-subtle">
                {entry.by} · {entry.when}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
