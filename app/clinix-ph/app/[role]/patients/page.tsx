import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { PatientDialog } from "@/src/components/clinic/patient-dialog";
import { PatientsPanel } from "@/src/components/clinic/patients-panel";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { listPatients } from "@/src/server/services/clinic-app";
import { listFieldDefinitions, visibleTo } from "@/src/server/services/patient-fields";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ q?: string | string[]; view?: string }> }) {
  const { role } = await params;
  const { q, view } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "";
  const { clinic } = await requireActiveClinic();
  const canWrite = clinic.role !== "practitioner";
  const archivedView = canWrite && view === "archived";
  const [{ rows, total }, definitions] = await Promise.all([listPatients(clinic.id, query, archivedView), listFieldDefinitions(clinic.id)]);
  const newPatientFields = visibleTo(clinic.role, definitions.filter((field) => !field.archived));

  return (
    <>
      <PageHeader title="Patients" description={`${total} ${total === 1 ? "record" : "records"} at ${clinic.name}.`} actions={canWrite && !archivedView ? <PatientDialog customFields={newPatientFields} /> : undefined} />
      <PatientsPanel rows={rows} total={total} query={query} archivedView={archivedView} canWrite={canWrite} basePath={`${roleHome(role)}/patients`} />
    </>
  );
}
