import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { AppointmentsBoard } from "@/src/components/clinic/appointments-board";
import { BookAppointmentDialog } from "@/src/components/clinic/book-appointment-dialog";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { dayParamSchema } from "@/src/lib/schemas/appointments";
import { clinicDateString, clinicLocalToUtc, listPractitioners, listTodayAppointments } from "@/src/server/services/clinic-app";
import { listServices } from "@/src/server/services/price-list";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ date?: string }> }) {
  const { role } = await params;
  const { clinic } = await requireActiveClinic();
  const isPractitioner = clinic.role === "practitioner";
  const requested = dayParamSchema.safeParse((await searchParams).date);
  const day = requested.success ? requested.data : clinicDateString(clinic.timezone);

  // A practitioner's calendar is their own chair only.
  const [rows, practitioners, services] = await Promise.all([
    listTodayAppointments(clinic, isPractitioner ? clinic.staffId : undefined, clinicLocalToUtc(`${day}T12:00`, clinic.timezone)),
    isPractitioner ? [] : listPractitioners(clinic.id),
    isPractitioner ? [] : listServices(clinic.id),
  ]);

  return (
    <>
      <PageHeader
        title={isPractitioner ? "My calendar" : "Appointments"}
        description={isPractitioner ? "Your patients by day." : "Book, move and cancel visits."}
        actions={isPractitioner ? undefined : <BookAppointmentDialog practitioners={practitioners} defaultDate={day} services={services.map((s) => ({ id: s.id, label: `${s.name}${s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}` }))} />}
      />
      <AppointmentsBoard
        rows={rows}
        day={day}
        timezone={clinic.timezone}
        basePath={`${roleHome(role)}/appointments`}
        patientsPath={`${roleHome(role)}/patients`}
        practitioners={practitioners}
        canManage={!isPractitioner}
        showPractitioner={!isPractitioner}
      />
    </>
  );
}
