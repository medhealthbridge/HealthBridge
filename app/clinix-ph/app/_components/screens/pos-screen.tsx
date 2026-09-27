"use client";

import { X } from "lucide-react";
import {
  BIR_FOOTER,
  PAYMENT_METHODS,
  POS_TXN_NO,
  STATUTORY_DISCOUNT_RATE,
  VAT_RATE,
  type PaymentMethod,
} from "@/src/lib/mock-data/clinix-app";
import { posTotals } from "@/src/lib/pos-totals";
import { formatPesoExact } from "@/src/lib/utils";
import type { CartItem } from "@/src/types/clinix-app";
import { DottedRow } from "../dotted-row";
import { Kicker } from "../kicker";
import { SectionHeading } from "../section-heading";

type PosScreenProps = {
  patient: string;
  items: CartItem[];
  senior: boolean;
  seniorId: string;
  payment: PaymentMethod;
  onRemoveItem: (index: number) => void;
  onOpenAdd: () => void;
  onToggleSenior: () => void;
  onSeniorIdChange: (value: string) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onIssueReceipt: (net: string) => void;
};

/** Owner / assistant: charge the person in front of you and issue the BIR receipt. */
export function PosScreen({
  patient,
  items,
  senior,
  seniorId,
  payment,
  onRemoveItem,
  onOpenAdd,
  onToggleSenior,
  onSeniorIdChange,
  onPaymentChange,
  onIssueReceipt,
}: PosScreenProps) {
  const totals = posTotals(items.map((item) => item.price), senior);

  const lines = senior
    ? [
        { label: "Subtotal (VAT-inclusive)", value: formatPesoExact(totals.gross), emphasis: "normal" as const },
        { label: `Less: ${VAT_RATE}% VAT exemption`, value: `− ${formatPesoExact(totals.vatExempt)}`, emphasis: "credit" as const },
        { label: `Less: ${STATUTORY_DISCOUNT_RATE}% statutory discount`, value: `− ${formatPesoExact(totals.discount)}`, emphasis: "credit" as const },
        { label: "VAT due", value: formatPesoExact(0), emphasis: "muted" as const },
      ]
    : [
        { label: "Subtotal (VAT-inclusive)", value: formatPesoExact(totals.gross), emphasis: "normal" as const },
        { label: "VAT-able sales", value: formatPesoExact(totals.gross - totals.vat), emphasis: "muted" as const },
        { label: `${VAT_RATE}% VAT`, value: formatPesoExact(totals.vat), emphasis: "muted" as const },
        { label: "Discount", value: formatPesoExact(0), emphasis: "muted" as const },
      ];

  const net = formatPesoExact(totals.net);

  return (
    <div className="flex flex-col gap-3.5">
      <SectionHeading title={`Cart · ${patient}`} aside={`Txn ${POS_TXN_NO}`} />

      <ul className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13.5px] font-extrabold text-slate-900">{item.name}</div>
              <div className="truncate text-[10.5px] text-slate-500">{item.meta}</div>
            </div>
            <span className="shrink-0 font-data text-[13.5px] tabular-nums text-slate-900">{formatPesoExact(item.price)}</span>
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => onRemoveItem(index)}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-brand-700 transition-colors duration-150 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpenAdd}
        className="min-h-11 w-full cursor-pointer rounded-lg border border-slate-300 px-3 text-[12.5px] font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        + Add service from price list
      </button>

      <section className="flex flex-col gap-3 rounded-xl bg-white p-3.5">
        <Kicker>Statutory discount · RA 9994 / RA 10754</Kicker>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={senior}
            onClick={onToggleSenior}
            className={`flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              senior ? "justify-end border-brand bg-brand" : "justify-start border-slate-300 bg-slate-200"
            }`}
          >
            <span className={`size-4 rounded-full ${senior ? "bg-white" : "bg-slate-500"}`} />
          </button>
          <span className="font-display text-[13.5px] font-extrabold text-slate-900">Senior Citizen / PWD discount</span>
        </div>

        {senior ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="pos-senior-id" className="text-[11px] font-semibold text-slate-600">
              Senior / PWD ID number
            </label>
            <input
              id="pos-senior-id"
              value={seniorId}
              onChange={(event) => onSeniorIdChange(event.target.value)}
              placeholder="SC-2019-QC-004821"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-data text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            />
            <p className="text-[10.5px] leading-relaxed text-slate-500">
              ID and signature are logged to the BIR-registered sales book as a VAT-exempt sale.
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <DottedRow key={line.label} label={line.label} value={line.value} emphasis={line.emphasis} />
        ))}
        <div className="mt-1 flex items-baseline gap-2.5 border-t-2 border-slate-200 pt-2.5">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">Net amount due</span>
          <span className="ml-auto font-display text-[27px] font-extrabold tracking-tight tabular-nums text-slate-900">{net}</span>
        </div>
      </section>

      <fieldset>
        <legend className="mb-2 text-[9px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Payment method</legend>
        <div className="grid grid-cols-3 gap-[7px]">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              aria-pressed={method === payment}
              onClick={() => onPaymentChange(method)}
              className={`min-h-11 cursor-pointer rounded-md border px-2 text-left font-display text-[12.5px] font-extrabold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                method === payment ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-900 hover:border-brand"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => onIssueReceipt(net)}
        className="min-h-12 w-full cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Generate BIR Official Receipt
      </button>
      <p className="text-[10px] text-slate-500">{BIR_FOOTER}</p>
    </div>
  );
}
