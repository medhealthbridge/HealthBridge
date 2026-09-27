import { PATIENT_RECORDS } from "@/src/lib/mock-data/clinix-app";
import type { BranchKey } from "@/src/types/clinix-app";
import { Pill } from "../pill";
import { SectionHeading } from "../section-heading";
import { EyePrescriptionPanel } from "../specialty/eye-prescription-panel";

export function RecordsScreen({ branch }: { branch: BranchKey }) {
  const records = PATIENT_RECORDS[branch];

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title={records.title} />

      {branch === "qc-eye" ? <EyePrescriptionPanel caption="Latest prescription · 14 Aug 2026" /> : null}

      <ul className="flex flex-col gap-2.5">
        {records.rows.map((row) => (
          <li key={row.title} className="flex items-baseline gap-2.5 border-b border-slate-200 pb-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[13.5px] font-extrabold text-slate-900">{row.title}</div>
              <div className="truncate text-[11px] text-slate-500">{row.meta}</div>
            </div>
            <Pill tone={row.tone}>{row.tag}</Pill>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="min-h-11 w-full cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Request a copy of my records
      </button>
    </div>
  );
}
