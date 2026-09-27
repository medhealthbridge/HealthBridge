"use client";

import { BOOKABLE_DATES, BOOKABLE_SLOTS, FULLY_BOOKED_SLOTS, SERVICES } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import type { BranchKey } from "@/src/types/clinix-app";
import { Kicker } from "../kicker";

type BookPickStepProps = {
  branch: BranchKey;
  clinicUrl: string;
  serviceIndex: number;
  dateIndex: number;
  slot: string;
  onServiceChange: (index: number) => void;
  onDateChange: (index: number) => void;
  onSlotChange: (slot: string) => void;
  onReview: () => void;
};

export function BookPickStep({
  branch,
  clinicUrl,
  serviceIndex,
  dateIndex,
  slot,
  onServiceChange,
  onDateChange,
  onSlotChange,
  onReview,
}: BookPickStepProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h2 className="font-display text-lg font-extrabold text-slate-900">Book an appointment</h2>
        <p className="text-[11.5px] text-slate-500">{clinicUrl} · tap Switch above to change clinic</p>
      </div>

      <fieldset className="border-t-2 border-slate-200 pt-2.5">
        <legend className="sr-only">Service</legend>
        <Kicker className="mb-2 block">1 · Service</Kicker>
        <div className="flex flex-col gap-[7px]">
          {SERVICES[branch].map((service, index) => {
            const selected = index === serviceIndex;
            return (
              <button
                key={service.name}
                type="button"
                aria-pressed={selected}
                onClick={() => onServiceChange(index)}
                className={`flex min-h-11 cursor-pointer items-baseline gap-2.5 rounded-md border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                  selected ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-900 hover:border-brand"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-[13.5px] font-extrabold">{service.name}</span>
                  <span className={`block truncate text-[10.5px] ${selected ? "opacity-80" : "text-slate-500"}`}>{service.meta}</span>
                </span>
                <span className="ml-auto shrink-0 font-data text-[13px] tabular-nums">{formatPeso(service.price)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-t-2 border-slate-200 pt-2.5">
        <legend className="sr-only">Date</legend>
        <Kicker className="mb-2 block">2 · Date</Kicker>
        <div className="flex gap-1.5">
          {BOOKABLE_DATES.map((date, index) => {
            const selected = index === dateIndex;
            return (
              <button
                key={date.full}
                type="button"
                aria-pressed={selected}
                aria-label={date.full}
                onClick={() => onDateChange(index)}
                className={`min-h-11 flex-1 cursor-pointer rounded-md border px-1 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                  selected ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-900 hover:border-brand"
                }`}
              >
                <span className={`block text-[9px] font-semibold tracking-[0.1em] uppercase ${selected ? "opacity-80" : "text-slate-500"}`}>
                  {date.dow}
                </span>
                <span className="block font-display text-[15px] font-extrabold">{date.day}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-t-2 border-slate-200 pt-2.5">
        <legend className="sr-only">Time slot</legend>
        <Kicker className="mb-2 block">3 · Time slot</Kicker>
        <div className="grid grid-cols-3 gap-1.5">
          {BOOKABLE_SLOTS.map((option) => {
            const full = FULLY_BOOKED_SLOTS.includes(option);
            const selected = option === slot && !full;
            return (
              <button
                key={option}
                type="button"
                disabled={full}
                aria-pressed={selected}
                onClick={() => onSlotChange(option)}
                className={`min-h-11 cursor-pointer rounded-md border px-1.5 text-left font-display text-[12.5px] font-extrabold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-900 hover:border-brand"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] text-slate-500">
          Greyed slots are fully booked. Walk-ins join the same queue after booked patients.
        </p>
      </fieldset>

      <button
        type="button"
        onClick={onReview}
        className="min-h-12 w-full cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Review booking →
      </button>
    </div>
  );
}
