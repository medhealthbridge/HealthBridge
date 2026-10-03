import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel } from "@/src/components/console/panel";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { addDays, clinicDateString, type PractitionerOption, type TodayAppointment } from "@/src/server/services/clinic-app";
import { CancelAppointmentButton } from "./cancel-appointment-button";
import { RescheduleDialog } from "./reschedule-dialog";
import { StatusButtons } from "./status-buttons";
import { StatusPill } from "./status-pill";

type AppointmentsBoardProps = {
  rows: TodayAppointment[];
  /** The calendar day shown, YYYY-MM-DD in the clinic's timezone. */
  day: string;
  timezone: string;
  /** This page's path; the date controls link back to it with ?date=. */
  basePath: string;
  /** Where a patient's chart lives, e.g. /clinix-ph/admin/patients. */
  patientsPath: string;
  practitioners: PractitionerOption[];
  /** Owners and the front desk may move and cancel bookings; others only change status. */
  canManage: boolean;
  showPractitioner: boolean;
};

const longDate = (day: string) => new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** One clinic day, with its bookings in order and the controls each role is allowed. */
export function AppointmentsBoard({ rows, day, timezone, basePath, patientsPath, practitioners, canManage, showPractitioner }: AppointmentsBoardProps) {
  const time = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  const link = (date: string) => `${basePath}?date=${date}`;
  const today = clinicDateString(timezone);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={link(addDays(day, -1))} aria-label="Previous day" className={consoleButtonClass("secondary", "md", "w-11 px-0")}><ChevronLeft aria-hidden="true" className="size-4" /></Link>
        <Link href={link(addDays(day, 1))} aria-label="Next day" className={consoleButtonClass("secondary", "md", "w-11 px-0")}><ChevronRight aria-hidden="true" className="size-4" /></Link>
        {day !== today && <Link href={basePath} className={consoleButtonClass("secondary")}>Today</Link>}
        <form className="flex items-center gap-2">
          <label htmlFor="board-date" className="sr-only">Go to date</label>
          <input id="board-date" name="date" type="date" defaultValue={day} className={`${CONSOLE_INPUT} w-auto`} />
          <button type="submit" className={consoleButtonClass("secondary")}>Go</button>
        </form>
        <h2 className="ml-auto font-display text-sm font-extrabold">{longDate(day)}</h2>
      </div>

      {rows.length === 0 ? (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">Nothing booked for this day.</Panel>
      ) : (
        <Panel>
          <ul className="divide-y divide-console-line">
            {rows.map((row) => {
              const movable = canManage && (row.status === "requested" || row.status === "confirmed");
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
                  <span className="w-24 shrink-0 font-data text-xs text-console-muted tabular-nums">
                    {time.format(row.startsAt)}–{time.format(row.endsAt)}
                  </span>
                  <div className="min-w-0 flex-1 basis-48">
                    <Link href={`${patientsPath}/${encodeURIComponent(row.mrn)}`} className="block truncate text-[13px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-console-accent">{row.patientName}</Link>
                    <p className="truncate text-[11px] text-console-subtle">
                      {[row.serviceName, showPractitioner ? row.practitionerName : null, row.source === "walk_in" ? "Walk-in" : null].filter(Boolean).join(" · ") || "No service set"}
                    </p>
                  </div>
                  <StatusPill status={row.status} />
                  <div className="ml-auto flex min-w-[8rem] flex-wrap justify-end gap-1.5">
                    <StatusButtons appointmentId={row.id} status={row.status} />
                    {movable && (
                      <>
                        <RescheduleDialog
                          appointmentId={row.id}
                          patientName={row.patientName}
                          date={clinicDateString(timezone, row.startsAt)}
                          time={new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timezone, hourCycle: "h23" }).format(row.startsAt)}
                          practitionerStaffId={row.practitionerStaffId}
                          practitioners={practitioners}
                        />
                        {row.status === "confirmed" && <CancelAppointmentButton appointmentId={row.id} patientName={row.patientName} />}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
