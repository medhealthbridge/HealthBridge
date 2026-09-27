import { PRACTITIONER_NAME, PRACTITIONER_SCHEDULE } from "@/src/lib/mock-data/clinix-app";
import { Pill } from "../pill";
import { SectionHeading } from "../section-heading";

/** Practitioner: who is on my list today, in order. */
export function ScheduleScreen({ clinicName }: { clinicName: string }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title="My schedule · Today" sub={`${PRACTITIONER_NAME} · ${clinicName}`} />
      <ul className="flex flex-col gap-2">
        {PRACTITIONER_SCHEDULE.map((slot) => (
          <li key={slot.time} className="flex items-baseline gap-3 rounded-xl bg-white p-3">
            <span className="w-16 shrink-0 font-display text-[12.5px] font-extrabold text-brand">{slot.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[13.5px] font-extrabold text-slate-900">{slot.patient}</span>
              <span className="block truncate text-[11.5px] text-slate-500">{slot.service}</span>
            </span>
            <Pill tone={slot.tone}>{slot.tag}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}
