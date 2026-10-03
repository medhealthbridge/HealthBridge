import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { listPatients, listPractitioners, listTodayAppointments } from "@/src/server/services/clinic-app";
import { AddWalkInDialog } from "@/src/components/clinic/add-walk-in-dialog";
import { QueueList } from "@/src/components/clinic/queue-list";

export const metadata: Metadata = { title: "Queue" };

const LIVE = ["requested", "confirmed", "checked_in", "in_progress"];

export default async function QueuePage({ params }: { params: Promise<{ role: AppRole }> }) {
  const { role } = await params;
  const { clinic } = await requireActiveClinic();
  // Practitioners work from their own schedule, not the whole floor's queue.
  if (clinic.role === "practitioner") notFound();

  const [appointments, patients, practitioners] = await Promise.all([
    listTodayAppointments(clinic),
    listPatients(clinic.id),
    listPractitioners(clinic.id),
  ]);
  const live = appointments.filter((item) => LIVE.includes(item.status));

  return (
    <>
      <PageHeader
        title="Queue"
        description="Everyone still to be seen today."
        actions={
          <AddWalkInDialog
            patients={patients.rows.map((row) => ({ id: row.id, label: `${row.name} · ${row.mrn}` }))}
            practitioners={practitioners}
            patientsHref={`${roleHome(role)}/patients`}
          />
        }
      />
      <QueueList appointments={live} timezone={clinic.timezone} patientsHref={`${roleHome(role)}/patients`} emptyText="The queue is clear." />
    </>
  );
}
