"use client";

import { ArrowLeft } from "lucide-react";
import type { Patient } from "@/src/types/clinix-app";
import { DottedRow } from "../dotted-row";
import { Kicker } from "../kicker";

type PatientDetailScreenProps = {
  patient: Patient;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
};

export function PatientDetailScreen({ patient, canEdit, onBack, onEdit, onArchive }: PatientDetailScreenProps) {
  const fullName = [patient.first, patient.middle, patient.last, patient.suffix].filter(Boolean).join(" ");

  const rows = [
    { label: "Sex / Age", value: `${patient.sex} · ${patient.age}` },
    { label: "Mobile", value: patient.mobile },
    { label: "PhilHealth", value: patient.philhealth || "—" },
    { label: "OSCA / PWD ID", value: patient.oscaId || "—" },
    { label: "Allergies", value: patient.allergies },
  ];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start text-[12px] font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Patients
      </button>

      <div className="border-b-2 border-slate-200 pb-2">
        <h2 className="font-display text-[15px] font-extrabold text-slate-900">{fullName}</h2>
        <p className="text-[11px] text-slate-500">{patient.id}</p>
      </div>

      <section className="flex flex-col gap-2 rounded-xl bg-white p-3.5">
        {rows.map((row) => (
          <DottedRow key={row.label} label={row.label} value={row.value} />
        ))}
      </section>

      <section className="rounded-xl bg-white p-3.5">
        <Kicker className="mb-1.5 block">Clinical notes</Kicker>
        <p className="text-[12.5px] leading-relaxed text-slate-700">{patient.notes || "—"}</p>
      </section>

      {canEdit ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 flex-1 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="min-h-11 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold text-brand-700 transition-colors duration-150 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Archive
          </button>
        </div>
      ) : null}
    </div>
  );
}
