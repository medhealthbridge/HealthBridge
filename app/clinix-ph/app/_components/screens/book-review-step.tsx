"use client";

import { ArrowLeft } from "lucide-react";
import { STATUTORY_DISCOUNT_RATE, VAT_RATE } from "@/src/lib/mock-data/clinix-app";
import { formatPesoExact } from "@/src/lib/utils";
import { Kicker } from "../kicker";

type BookReviewStepProps = {
  rows: { label: string; value: string }[];
  price: number;
  onBack: () => void;
  onConfirm: () => void;
};

export function BookReviewStep({ rows, price, onBack, onConfirm }: BookReviewStepProps) {
  // Same statutory order as the counter: exempt the VAT, then discount the base.
  const due = (price / (1 + VAT_RATE / 100)) * (1 - STATUTORY_DISCOUNT_RATE / 100);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-lg font-extrabold text-slate-900">Review</h2>
        <button
          type="button"
          onClick={onBack}
          className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Change
        </button>
      </div>

      <dl className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
            <dt className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{row.label}</dt>
            <dd className="ml-auto text-right font-display text-[13px] font-extrabold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-2 rounded-xl bg-white p-3">
        <Kicker>Estimated charge</Kicker>
        <div className="flex items-baseline gap-2.5 text-[12.5px] text-slate-700">
          <span>Service fee</span>
          <span className="ml-auto font-data tabular-nums">{formatPesoExact(price)}</span>
        </div>
        <div className="flex items-baseline gap-2.5 text-[12.5px] text-brand-700">
          <span>Senior / PWD adjustment</span>
          <span className="ml-auto font-data tabular-nums">− {formatPesoExact(price - due)}</span>
        </div>
        <div className="flex items-baseline gap-2.5 border-t-2 border-slate-200 pt-2">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">Due at clinic</span>
          <span className="ml-auto font-display text-[22px] font-extrabold tabular-nums text-slate-900">
            {formatPesoExact(due)}
          </span>
        </div>
        <p className="text-[10.5px] text-slate-500">
          Estimate only. Final amount and the BIR official receipt are issued at the clinic counter.
        </p>
      </section>

      <button
        type="button"
        onClick={onConfirm}
        className="min-h-12 w-full cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Confirm booking
      </button>
      <p className="text-[10.5px] text-slate-500">Free cancellation up to 2 hours before your slot.</p>
    </div>
  );
}
