import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { StatGrid } from "@/src/components/console/stat-grid";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { listReminderCandidates, reminderStats } from "@/src/server/services/reminders";
import { RemindersToggle, SendNowButton } from "./_components/reminder-controls";

export const metadata: Metadata = { title: "Reminders & delivery" };

export default async function RemindersPage() {
  const { clinic } = await requireActiveClinicOwner();
  const [stats, rows] = await Promise.all([reminderStats(clinic.id, clinic.timezone), listReminderCandidates(clinic)]);
  const when = new Intl.DateTimeFormat("en-PH", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: clinic.timezone });
  const noEmail = rows.filter((row) => !row.email).length;

  return (
    <>
      <PageHeader
        title="Reminders & delivery"
        description="Email reminders the day before an appointment. SMS isn't set up yet."
        actions={<RemindersToggle enabled={stats.enabled} />}
      />
      <StatGrid
        stats={[
          { label: "Daily reminders", value: stats.enabled ? "On" : "Off", sub: stats.enabled ? "Sent each morning (Manila time) for tomorrow" : "Nothing is sent automatically", tone: stats.enabled ? "accent" : "neutral" },
          { label: "Sent (30 days)", value: String(stats.sent), sub: "Delivered to the email provider" },
          { label: "Failed (30 days)", value: String(stats.failed), sub: "Use Retry below", tone: stats.failed > 0 ? "danger" : "neutral" },
        ]}
        columns={3}
      />
      {noEmail > 0 && <Panel className="px-4 py-3 text-[13px] text-console-muted">{noEmail} upcoming {noEmail === 1 ? "patient has" : "patients have"} no reminder email. Add one from the patient&rsquo;s chart.</Panel>}
      {rows.length === 0 ? (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">No booked appointments from now until the end of tomorrow.</Panel>
      ) : (
        <TableCard label="Upcoming reminders">
          <thead><tr><Th>When</Th><Th>Patient</Th><Th>Service</Th><Th>Email</Th><Th>Reminder</Th><Th className="w-28"><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.appointmentId}>
                <Td className="whitespace-nowrap">{when.format(row.startsAt)}</Td>
                <Td className="font-semibold">{row.patientName}</Td>
                <Td className="text-console-muted">{row.serviceName ?? "—"}</Td>
                <Td>{row.email ? <span className="text-console-muted">on file</span> : <Pill tone="warn">None</Pill>}</Td>
                <Td><Pill tone={row.status === "sent" ? "accent" : row.status === "failed" ? "danger" : "neutral"}>{row.status === "sent" ? "Sent" : row.status === "failed" ? "Failed" : "Not sent"}</Pill></Td>
                <Td><RowActions>{row.email && row.status !== "sent" && <SendNowButton appointmentId={row.appointmentId} retry={row.status === "failed"} />}</RowActions></Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
