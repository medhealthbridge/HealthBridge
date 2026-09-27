"use client";

import { ArrowRight } from "lucide-react";
import type { Patient } from "@/src/types/clinix-app";
import { Pill } from "../pill";
import { SectionHeading } from "../section-heading";

type PatientsScreenProps = {
  patients: Patient[];
  search: string;
  /** Practitioners read the chart; they do not register or archive patients. */
  canEdit: boolean;
  onSearchChange: (value: string) => void;
  onView: (id: string) => void;
  onRegister: () => void;
};

export function PatientsScreen({ patients, search, canEdit, onSearchChange, onView, onRegister }: PatientsScreenProps) {
  const query = search.trim().toLowerCase();
  const visible = patients.filter((patient) => {
    if (patient.archived) return false;
    if (!query) return true;
    return `${patient.first} ${patient.last} ${patient.id} ${patient.mobile}`.toLowerCase().includes(query);
  });

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title={`Patients · ${patients.filter((patient) => !patient.archived).length}`}
        aside={
          canEdit ? (
            <button
              type="button"
              onClick={onRegister}
              className="min-h-11 cursor-pointer rounded-lg bg-brand px-3 text-[12px] font-semibold text-white normal-case transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              + Register
            </button>
          ) : undefined
        }
      />

      <label className="sr-only" htmlFor="patient-search">
        Search patients
      </label>
      <input
        id="patient-search"
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search name, MRN or mobile"
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
      />

      {visible.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-center text-[12.5px] text-slate-500">
          No patient matches “{search.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                onClick={() => onView(patient.id)}
                className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white p-3 text-left transition-colors duration-150 hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-display text-sm font-extrabold text-slate-900">
                    {patient.first} {patient.last}
                  </span>
                  <span className="truncate text-[11px] text-slate-500">
                    {patient.id} · {patient.sex} · {patient.age} · {patient.mobile}
                  </span>
                </span>
                {patient.oscaId ? <Pill tone="outline">SC/PWD</Pill> : patient.philhealth ? <Pill tone="outline">PhilHealth</Pill> : null}
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-brand" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
