import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { listPatients, listPractitioners, listTodayAppointments } from "@/src/server/services/clinic-app";
import { AddWalkInDialog } from "./_components/add-walk-in-dialog";
import { QueueList } from "./_components/queue-table";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ params }: { params: Promise<{ role: AppRole }> }) {
  const { role } = await params;
  const { clinic } = await requireActiveClinic();
  const isPractitioner = clinic.role === "practitioner";

  const appointments = await listTodayAppointments(clinic, isPractitioner ? clinic.staffId : undefined);
  const count = (...statuses: string[]) => appointments.filter((item) => statuses.includes(item.status)).length;

  const [patients, practitioners] = isPractitioner
    ? [{ rows: [] }, []]
    : await Promise.all([listPatients(clinic.id), listPractitioners(clinic.id)]);

  return (
    <>
      <PageHeader
        title={isPractitioner ? "My schedule" : "Today"}
        description={isPractitioner ? "Your patients for today." : `Floor at ${clinic.name}.`}
        actions={
          isPractitioner ? undefined : (
            <AddWalkInDialog
              patients={patients.rows.map((row) => ({ id: row.id, label: `${row.name} · ${row.mrn}` }))}
              practitioners={practitioners}
              patientsHref={`${roleHome(role)}/patients`}
            />
          )
        }
      />
      <StatGrid
        stats={[
          { label: "Booked today", value: String(appointments.length), sub: "All appointments", tone: "neutral" },
          { label: "Waiting", value: String(count("checked_in")), sub: "Checked in", tone: "warn" },
          { label: "In chair", value: String(count("in_progress")), sub: "With a practitioner", tone: "accent" },
          { label: "Done", value: String(count("completed")), sub: "Completed today", tone: "info" },
        ]}
      />
      <QueueList
        appointments={appointments}
        timezone={clinic.timezone}
        patientsHref={`${roleHome(role)}/patients`}
        showPractitioner={!isPractitioner}
        emptyText={isPractitioner ? "Nothing on your schedule today." : "No one is booked or waiting yet. Add a walk-in to start the queue."}
      />
    </>
  );
}
