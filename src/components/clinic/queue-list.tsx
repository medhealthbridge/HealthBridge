import Link from "next/link";
import { Panel } from "@/src/components/console/panel";
import type { TodayAppointment } from "@/src/server/services/clinic-app";
import { StatusButtons } from "./status-buttons";
import { StatusPill } from "./status-pill";

const timeFormat = (timezone: string) =>
  new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone });

/** One row per appointment: who, when, with whom, and the next step for it. */
export function QueueList({
  appointments,
  timezone,
  patientsHref,
  emptyText,
  showPractitioner = true,
}: {
  appointments: TodayAppointment[];
  timezone: string;
  patientsHref: string;
  emptyText: string;
  showPractitioner?: boolean;
}) {
  if (appointments.length === 0) {
    return <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">{emptyText}</Panel>;
  }
  const format = timeFormat(timezone);
  return (
    <Panel>
      <ul className="divide-y divide-console-line">
        {appointments.map((appointment) => (
          <li key={appointment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
            <span className="w-8 shrink-0 font-data text-sm text-console-subtle tabular-nums">
              {appointment.queueNumber ? `#${appointment.queueNumber}` : "–"}
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <Link
                href={`${patientsHref}/${encodeURIComponent(appointment.mrn)}`}
                className="block truncate text-[13px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-console-accent"
              >
                {appointment.patientName}
              </Link>
              <p className="truncate text-[11px] text-console-subtle">
                {format.format(appointment.startsAt)}
                {showPractitioner && appointment.practitionerName ? ` · ${appointment.practitionerName}` : ""}
                {appointment.chairOrRoom ? ` · ${appointment.chairOrRoom}` : ""}
                {appointment.source === "walk_in" ? " · Walk-in" : ""}
              </p>
            </div>
            <StatusPill status={appointment.status} />
            <div className="ml-auto min-w-[8rem]">
              <StatusButtons appointmentId={appointment.id} status={appointment.status} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
