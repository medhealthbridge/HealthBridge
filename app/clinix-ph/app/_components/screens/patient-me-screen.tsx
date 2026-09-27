import { PATIENT_PROFILE } from "@/src/lib/mock-data/clinix-app";
import { LabelledRow } from "../labelled-row";
import { SectionHeading } from "../section-heading";

export function PatientMeScreen({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title={name} />
      <div className="flex flex-col gap-2.5">
        {PATIENT_PROFILE.map((row) => (
          <LabelledRow key={row.label} row={row} />
        ))}
      </div>
      <p className="text-[10.5px] leading-relaxed text-slate-500">
        Your records are held per clinic subdomain. Sharing between branches needs your consent under the Data Privacy
        Act.
      </p>
    </div>
  );
}
