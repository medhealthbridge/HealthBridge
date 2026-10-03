import Link from "next/link";
import { Panel } from "@/src/components/console/panel";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { Pill } from "@/src/components/console/pill";
import { ArchiveButton } from "@/src/components/console/archive-button";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { setPatientArchivedAction } from "@/src/server/actions/clinic-app";
import type { PatientRow } from "@/src/server/services/clinic-app";
import { PatientDialog } from "./patient-dialog";

const dateFormat = new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" });

export const ageOf = (dateOfBirth: string | null) => (dateOfBirth ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null);

type PatientsPanelProps = {
  rows: PatientRow[];
  total: number;
  query: string;
  archivedView: boolean;
  /** Owners and the front desk write; practitioners only read. */
  canWrite: boolean;
  /** This page's own path, for the search form and the Archived toggle. */
  basePath: string;
};

/** The patient list shared by the owner console and the clinic app, so both show the same records the same way. */
export function PatientsPanel({ rows, total, query, archivedView, canWrite, basePath }: PatientsPanelProps) {
  const viewHref = archivedView ? basePath : `${basePath}?view=archived`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form role="search" className="flex min-w-0 flex-1 gap-2">
          {archivedView && <input type="hidden" name="view" value="archived" />}
          <input type="search" name="q" defaultValue={query} aria-label="Search patients" placeholder="Name, MRN or mobile" className={`${CONSOLE_INPUT} min-w-0 flex-1 md:max-w-sm`} />
          <button type="submit" className={consoleButtonClass("secondary")}>Search</button>
        </form>
        {canWrite && <Link href={viewHref} className={consoleButtonClass("secondary")}>{archivedView ? "Back to active" : "Show archived"}</Link>}
      </div>

      {rows.length === 0 ? (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">
          {query ? `No patients match “${query}”.` : archivedView ? "No archived patients." : canWrite ? "No patients yet. Add the first one to start the queue." : "No patients yet."}
        </Panel>
      ) : (
        <TableCard label={archivedView ? "Archived patients" : "Patients"}>
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>MRN</Th>
              <Th>Mobile</Th>
              <Th>Coverage</Th>
              <Th>Last visit</Th>
              {canWrite && <Th className="w-48"><span className="sr-only">Actions</span></Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const age = ageOf(row.dateOfBirth);
              return (
                <Tr key={row.id}>
                  <Td className="font-semibold">
                    <Link href={`${basePath}/${encodeURIComponent(row.mrn)}${archivedView ? "?view=archived" : ""}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-console-accent">{row.name}</Link>
                    <span className="ml-1.5 text-[11px] font-normal text-console-subtle">{[row.sex, age !== null ? `${age} yrs` : null].filter(Boolean).join(" · ")}</span>
                  </Td>
                  <Td className="font-data text-console-muted">{row.mrn}</Td>
                  <Td className="text-console-muted">{row.phone ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {row.philhealth && <Pill tone="info">PhilHealth</Pill>}
                      {row.discountId && <Pill tone="accent">Discount ID</Pill>}
                      {!row.philhealth && !row.discountId && <span className="text-console-subtle">—</span>}
                    </div>
                  </Td>
                  <Td className="text-console-muted">{row.lastVisit ? dateFormat.format(row.lastVisit) : "—"}</Td>
                  {canWrite && (
                    <Td>
                      <RowActions>
                        <div className="flex justify-end gap-1.5">
                          {!archivedView && <PatientDialog patient={row} />}
                          <ArchiveButton id={row.id} name={row.name} noun="patient" action={setPatientArchivedAction} archived={archivedView} consequence="They stop appearing in the list and for new bookings. Their record, visits and history are kept." />
                        </div>
                      </RowActions>
                    </Td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
      {total > rows.length && <p className="text-xs text-console-muted">Showing the first {rows.length} of {total}. Search to narrow down.</p>}
    </>
  );
}
