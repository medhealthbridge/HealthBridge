import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { QUEUE, QUEUE_STATUS_TONE, QUEUE_SUMMARY } from "@/src/lib/mock-data/clinix-admin";

export function LiveQueueCard() {
  return (
    <Panel className="min-w-0">
      <PanelHeader title="Live queue & appointments">
        <div className="flex flex-wrap gap-1.5">
          {QUEUE_SUMMARY.map((item) => (
            <Pill key={item.label} tone={item.tone}>
              {item.label}
            </Pill>
          ))}
        </div>
      </PanelHeader>
      <ul>
        {QUEUE.map((entry) => (
          <li key={entry.ticket} className="flex items-center gap-3 border-b border-console-line px-3.5 py-2.5 last:border-b-0">
            <span className="w-12 shrink-0 font-data text-xs text-console-accent tabular-nums">{entry.time}</span>
            <span className="hidden w-14 shrink-0 font-data text-[11px] text-console-subtle sm:inline">{entry.ticket}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{entry.patient}</p>
              <p className="truncate text-[11px] text-console-subtle">
                {entry.service} · {entry.practitioner}
              </p>
            </div>
            <Pill tone={QUEUE_STATUS_TONE[entry.status]}>{entry.status}</Pill>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
