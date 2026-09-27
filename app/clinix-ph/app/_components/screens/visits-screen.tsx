"use client";

import { PAST_VISITS, PATIENT_RECORDS } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import type { BranchKey } from "@/src/types/clinix-app";
import { Kicker } from "../kicker";
import { SectionHeading } from "../section-heading";

type VisitsScreenProps = {
  branch: BranchKey;
  clinicName: string;
  upcoming: { ticketNo: string; serviceName: string; when: string } | null;
  onViewTicket: () => void;
  onCancel: () => void;
};

export function VisitsScreen({ branch, clinicName, upcoming, onViewTicket, onCancel }: VisitsScreenProps) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title="My visits" />

      {upcoming ? (
        <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
          <div className="flex items-baseline gap-2">
            <Kicker>Upcoming</Kicker>
            <span className="ml-auto font-display text-[13px] font-extrabold text-brand">{upcoming.ticketNo}</span>
          </div>
          <p className="font-display text-[15px] font-extrabold text-slate-900">{upcoming.serviceName}</p>
          <p className="text-[12px] text-slate-500">
            {upcoming.when} · {clinicName}
          </p>
          <div className="mt-0.5 flex gap-2">
            <button
              type="button"
              onClick={onViewTicket}
              className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-2.5 text-[12px] font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              View ticket
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 cursor-pointer px-1 text-[12px] font-semibold text-brand transition-colors duration-150 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <Kicker>Past</Kicker>
      <ul className="flex flex-col gap-2.5">
        {PAST_VISITS[branch].map((visit) => (
          <li key={visit.or} className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13.5px] font-extrabold text-slate-900">{visit.service}</div>
              <div className="truncate text-[11px] text-slate-500">
                {visit.date} · {PATIENT_RECORDS[branch].clinic}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-data text-[12.5px] tabular-nums text-slate-900">{formatPeso(visit.paid)}</div>
              <div className="font-data text-[10px] text-slate-400">OR {visit.or}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
