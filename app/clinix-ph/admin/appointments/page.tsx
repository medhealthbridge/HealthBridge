import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { AppointmentsBoard } from "@/src/components/clinic/appointments-board";
import { BookAppointmentDialog } from "@/src/components/clinic/book-appointment-dialog";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { dayParamSchema } from "@/src/lib/schemas/appointments";
import { clinicDateString, clinicLocalToUtc, listPractitioners, listTodayAppointments } from "@/src/server/services/clinic-app";
import { listServices } from "@/src/server/services/price-list";

export const metadata: Metadata = { title: "Appointments & queue" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  const requested = dayParamSchema.safeParse((await searchParams).date);
  const day = requested.success ? requested.data : clinicDateString(clinic.timezone);
  const [rows, practitioners, services] = await Promise.all([
    listTodayAppointments(clinic, undefined, clinicLocalToUtc(`${day}T12:00`, clinic.timezone)),
    listPractitioners(clinic.id),
    listServices(clinic.id),
  ]);

  return (
    <>
      <PageHeader
        title="Appointments & queue"
        description="Book, move and cancel visits. Requested bookings wait here for you to confirm."
        actions={<BookAppointmentDialog practitioners={practitioners} defaultDate={day} services={services.map((s) => ({ id: s.id, label: `${s.name}${s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}` }))} />}
      />
      <AppointmentsBoard
        rows={rows}
        day={day}
        timezone={clinic.timezone}
        basePath={`${CLINIX_ROUTES.admin}/appointments`}
        patientsPath={`${CLINIX_ROUTES.admin}/patients`}
        practitioners={practitioners}
        canManage
        showPractitioner
      />
    </>
  );
}
