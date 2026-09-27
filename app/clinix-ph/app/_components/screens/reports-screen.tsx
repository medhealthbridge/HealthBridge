import {
  REPORTS_AS_OF,
  REPORT_DAILY_SALES,
  REPORT_METHODS,
  REPORT_NO_SHOW_RATE,
  REPORT_PRACTITIONER_EARNINGS,
  REPORT_TOP_SERVICES,
} from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import { DottedRow } from "../dotted-row";
import { Kicker } from "../kicker";
import { SectionHeading } from "../section-heading";
import { StatTile } from "../stat-tile";

/** Owner, HQ mode: the read-only end-of-day picture. Anything editable is in the console. */
export function ReportsScreen() {
  return (
    <div className="flex flex-col gap-3.5">
      <SectionHeading title="Reports · Today" sub={REPORTS_AS_OF} />

      <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
        <Kicker>Daily sales</Kicker>
        {REPORT_DAILY_SALES.map((row) => {
          const amount = Number(row.value);
          return (
            <DottedRow
              key={row.label}
              label={row.label}
              value={amount < 0 ? `− ${formatPeso(Math.abs(amount))}` : formatPeso(amount)}
              emphasis={amount < 0 ? "credit" : "normal"}
            />
          );
        })}
      </section>

      <section className="flex flex-col gap-2.5 rounded-xl bg-white p-3.5">
        <Kicker>Collections by payment method</Kicker>
        {REPORT_METHODS.map((method) => (
          <div key={method.name} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 text-[12.5px]">
              <span className="flex-1 text-slate-700">{method.name}</span>
              <span className="font-data tabular-nums text-slate-900">{formatPeso(Number(method.value))}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand" style={{ width: `${method.pct}%` }} />
            </div>
          </div>
        ))}
      </section>

      <div className="flex gap-2.5">
        <StatTile label="No-show rate" value={REPORT_NO_SHOW_RATE} />
      </div>

      <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
        <Kicker>Top services</Kicker>
        {REPORT_TOP_SERVICES.map((row) => (
          <div key={row.name} className="flex items-baseline gap-2.5 text-[12.5px]">
            <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
            <span className="shrink-0 font-data tabular-nums text-slate-500">{row.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
        <Kicker>Per-practitioner earnings (PF share)</Kicker>
        {REPORT_PRACTITIONER_EARNINGS.map((row) => (
          <div key={row.name} className="flex items-baseline gap-2.5 text-[12.5px]">
            <span className="min-w-0 flex-1 truncate text-slate-700">{row.name}</span>
            <span className="shrink-0 font-data tabular-nums text-slate-900">{row.value}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
