import { PRACTITIONER_LICENCE, PRACTITIONER_NAME } from "@/src/lib/mock-data/clinix-app";
import { SectionHeading } from "../section-heading";

export function PractitionerMeScreen() {
  return (
    <div className="flex flex-col gap-3">
      <SectionHeading title="My credentials" />
      <section className="flex flex-col gap-1 rounded-xl bg-white p-3.5">
        <p className="font-display text-[15px] font-extrabold text-slate-900">{PRACTITIONER_NAME}</p>
        <p className="font-data text-[12px] text-slate-500">{PRACTITIONER_LICENCE}</p>
      </section>
    </div>
  );
}
