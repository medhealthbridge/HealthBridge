import { PRACTITIONER_EARNINGS, PRACTITIONER_NET_FEE } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import { DottedRow } from "../dotted-row";
import { SectionHeading } from "../section-heading";

/** Practitioner: their own professional fee only — never clinic revenue. */
export function EarningsScreen() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title="My earnings · This month" />
      <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
        {PRACTITIONER_EARNINGS.map((row) => (
          <DottedRow key={row.label} label={row.label} value={formatPeso(Number(row.value))} />
        ))}
        <div className="mt-1 flex items-baseline gap-2.5 border-t-2 border-slate-200 pt-2.5">
          <span className="text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">Net professional fee</span>
          <span className="ml-auto font-display text-[23px] font-extrabold tabular-nums text-slate-900">
            {formatPeso(PRACTITIONER_NET_FEE)}
          </span>
        </div>
      </section>
      <p className="text-[10.5px] text-slate-500">
        Practitioners see only their own earnings and patients — not clinic revenue, stock or staff.
      </p>
    </div>
  );
}
