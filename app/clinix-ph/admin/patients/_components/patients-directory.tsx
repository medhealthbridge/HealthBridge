"use client";

import { useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Monogram } from "@/src/components/console/monogram";
import { PageHeader } from "@/src/components/console/page-header";
import { Pill } from "@/src/components/console/pill";
import { ToastButton } from "@/src/components/console/toast";
import type { Patient } from "@/src/lib/mock-data/clinix-admin";
import { formatPeso } from "@/src/lib/utils";
import { ImportButton } from "../../_components/import-button";
import { PatientDrawer } from "./patient-drawer";

/** Header search, the patient table and the record drawer share search/selection state. */
export function PatientsDirectory({ patients }: { patients: Patient[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);

  const needle = search.trim().toLowerCase();
  const rows = patients.filter((p) => !needle || `${p.name} ${p.mrn} ${p.meta}`.toLowerCase().includes(needle));

  return (
    <>
      <PageHeader
        title="Patients & records"
        description={`${patients.length} active · open a row for the full record`}
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search MRN, name, mobile"
              aria-label="Search patients by MRN, name or mobile"
              className={`${CONSOLE_INPUT} w-full sm:w-52`}
            />
            <ImportButton kind="patients" />
            <ToastButton message="CSV export queued — you will get an email">Export CSV</ToastButton>
            <ToastButton variant="primary" message="Opening patient registration">
              + New patient
            </ToastButton>
          </>
        }
      />

      <TableCard label="Patients">
        <thead>
          <tr>
            <Th>MRN</Th>
            <Th>Patient</Th>
            <Th>Last visit</Th>
            <Th>Treatment plan</Th>
            <Th>Payor</Th>
            <Th numeric>Balance</Th>
            <Th className="w-24">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((patient) => (
            <Tr key={patient.mrn} onClick={() => setSelected(patient)} className="cursor-pointer">
              <Td className="font-data text-xs text-console-muted">{patient.mrn}</Td>
              <Td>
                <div className="flex items-center gap-2.5">
                  <Monogram name={patient.name} round />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{patient.name}</p>
                    <p className="font-data text-[10px] text-console-subtle">{patient.meta}</p>
                  </div>
                </div>
              </Td>
              <Td className="font-data text-xs text-console-muted">{patient.lastVisit}</Td>
              <Td className="text-console-muted">{patient.plan}</Td>
              <Td>
                <Pill tone={patient.payorTone}>{patient.payor}</Pill>
              </Td>
              <Td numeric>{patient.balance ? formatPeso(patient.balance) : "—"}</Td>
              <Td>
                <RowActions>
                  <ConsoleButton size="sm" onClick={() => setSelected(patient)} aria-label={`Open record for ${patient.name}`}>
                    Record
                  </ConsoleButton>
                </RowActions>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <Td colSpan={7} className="py-6 text-center text-console-subtle">
                No patients match “{search}”.
              </Td>
            </tr>
          )}
        </tbody>
      </TableCard>

      <PatientDrawer patient={selected} onClose={() => setSelected(null)} />
    </>
  );
}
