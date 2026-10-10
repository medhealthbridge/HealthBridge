import { PageHeader } from "@/src/components/console/page-header";
import { Pill } from "@/src/components/console/pill";
import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { listPatients, type StaffClinic } from "@/src/server/services/clinic-app";
import { listRecalls } from "@/src/server/services/recalls";
import { RecallActions, RecallDialog } from "./recall-actions";

const TIMING = { overdue: { label: "Overdue", tone: "danger" }, soon: { label: "Due within 30 days", tone: "warn" }, later: { label: "Later", tone: "neutral" } } as const;

/** Patients due back. A reminder list, not a booking: staff decide whether and when to contact them. */
export async function RecallsPage({ clinic }: { clinic: Pick<StaffClinic, "id" | "role" | "timezone"> }) {
  const [rows, { rows: patients }] = await Promise.all([listRecalls(clinic), listPatients(clinic.id)]);
  // Due dates are calendar dates (no time), so they are shown as-is; "reminded" is a moment, shown in the clinic's timezone.
  const dueFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" });
  const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: clinic.timezone });
  const canEmail = clinic.role !== "practitioner";
  return (
    <>
      <PageHeader title="Recalls" description="Patients due for a check-up or follow-up. These are reminders only; nothing is booked or sent unless you choose to." actions={<RecallDialog patients={patients.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn }))} />} />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-console-line p-6 text-center text-[13px] text-console-muted">No one is due back. Add a recall from a checkout, or here.</p>
      ) : (
        <TableCard label="Recalls">
          <thead>
            <tr><Th>Patient</Th><Th>Due</Th><Th>Reason</Th><Th>Status</Th><Th>Contact</Th><Th><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>{row.patientName} <span className="text-console-muted">{row.mrn}</span></Td>
                <Td className="whitespace-nowrap">{dueFormat.format(new Date(`${row.dueDate}T00:00:00Z`))}</Td>
                <Td>{row.reason ?? "Check-up"}</Td>
                <Td>
                  <Pill tone={TIMING[row.timing].tone}>{TIMING[row.timing].label}</Pill>
                  {row.notifiedAt && <span className="ml-1.5 text-[11px] text-console-subtle">Reminded {dateFormat.format(row.notifiedAt)}</span>}
                </Td>
                <Td className="text-console-muted">{row.phone ?? row.email ?? "—"}</Td>
                <Td><RecallActions id={row.id} canEmail={canEmail && !!row.email} /></Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
