import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { Panel } from "@/src/components/console/panel";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { Pill } from "@/src/components/console/pill";
import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { listPatients } from "@/src/server/services/clinic-app";
import { AddPatientDialog } from "../_components/add-patient-dialog";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "";
  const { clinic } = await requireActiveClinic();
  const { rows, total } = await listPatients(clinic.id, query);

  return (
    <>
      <PageHeader title="Patients" description={`${total} ${total === 1 ? "record" : "records"} at ${clinic.name}.`} actions={<AddPatientDialog />} />
      <form role="search" className="flex gap-2">
        <input type="search" name="q" defaultValue={query} aria-label="Search patients" placeholder="Name, MRN or mobile" className={`${CONSOLE_INPUT} min-w-0 flex-1 md:max-w-sm`} />
        <button type="submit" className={consoleButtonClass("secondary")}>Search</button>
      </form>
      {rows.length === 0 ? (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">
          {query ? `No patients match “${query}”.` : "No patients yet. Add the first one to start the queue."}
        </Panel>
      ) : (
        <TableCard label="Patients">
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>MRN</Th>
              <Th>Mobile</Th>
              <Th>Coverage</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-semibold">{row.name}</Td>
                <Td className="font-data text-console-muted">{row.mrn}</Td>
                <Td className="text-console-muted">{row.phone ?? "–"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {row.philhealth && <Pill tone="info">PhilHealth</Pill>}
                    {row.discountId && <Pill tone="accent">Discount ID</Pill>}
                    {!row.philhealth && !row.discountId && <span className="text-console-subtle">–</span>}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
      {total > rows.length && <p className="text-xs text-console-muted">Showing the first {rows.length}. Search to narrow down.</p>}
    </>
  );
}
