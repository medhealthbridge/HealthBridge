"use client";

import { CLINIC_ADDRESSES } from "@/src/lib/mock-data/clinix-app";
import type { BranchKey } from "@/src/types/clinix-app";

type BookTicketStepProps = {
  branch: BranchKey;
  clinicName: string;
  ticketNo: string;
  when: string;
  serviceName: string;
  confirmed: boolean;
  onViewVisits: () => void;
  onCancel: () => void;
};

export function BookTicketStep({
  branch,
  clinicName,
  ticketNo,
  when,
  serviceName,
  confirmed,
  onViewVisits,
  onCancel,
}: BookTicketStepProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <section className="rounded-xl bg-brand p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-[9.5px] font-semibold tracking-[0.14em] uppercase opacity-85">Queue number</span>
          <span className="ml-auto">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                confirmed ? "bg-white text-brand-700" : "border border-white/70 text-white"
              }`}
            >
              {confirmed ? "Confirmed" : "Awaiting confirmation"}
            </span>
          </span>
        </div>
        <p className="my-1 font-display text-[46px] leading-none font-extrabold tracking-tight">{ticketNo}</p>
        <p className="border-t-2 border-white/45 pt-2 text-[13px]">{when}</p>
        <p className="text-[12px] opacity-90">
          {serviceName} · {clinicName}
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-xl bg-white p-3">
        <div className="grid size-[78px] shrink-0 place-items-center rounded-md border border-slate-200 text-center text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
          QR code placeholder
        </div>
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          Show this at reception to check in. We will text you when the patient ahead of you is called. Bring your Senior
          / PWD ID if claiming the statutory discount.
        </p>
      </div>

      <dl className="flex flex-col gap-2.5">
        <TicketRow label="Address" value={CLINIC_ADDRESSES[branch]} />
        <TicketRow label="Check-in" value="From 15 min before your slot" />
        <TicketRow label="Payment" value="GCash, Maya, QR Ph, cash or card" />
      </dl>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onViewVisits}
          className="min-h-11 flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          My visits
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Cancel booking
        </button>
      </div>
    </div>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
      <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="ml-auto text-right text-[12.5px] text-slate-700">{value}</dd>
    </div>
  );
}
