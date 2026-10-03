import Link from "next/link";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { StatusPill } from "@/src/components/clinic/status-pill";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import type { Overview } from "@/src/server/services/overview";

/** Today's real appointments and walk-ins, in time order. */
export function LiveQueueCard({ queue, summary, timezone }: { queue: Overview["queue"]; summary: Overview["queueSummary"]; timezone: string }) {
  const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  return (
    <Panel className="min-w-0">
      <PanelHeader title="Today's appointments">
        <div className="flex flex-wrap gap-1.5">
          {summary.map((item) => <Pill key={item.label} tone={item.tone}>{item.label}</Pill>)}
        </div>
      </PanelHeader>
      {queue.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[13px] text-console-muted">
          Nothing booked today. <Link href={`${CLINIX_ROUTES.admin}/appointments`} className="font-semibold text-console-accent underline">Book an appointment</Link>
        </p>
      ) : (
        <ul>
          {queue.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 border-b border-console-line px-3.5 py-2.5 last:border-b-0">
              <span className="w-16 shrink-0 font-data text-xs text-console-accent tabular-nums">{time.format(entry.startsAt)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{entry.patientName}</p>
                <p className="truncate text-[11px] text-console-subtle">{entry.serviceName ?? "Visit"} · {entry.practitionerName ?? "Any practitioner"}</p>
              </div>
              <StatusPill status={entry.status} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
