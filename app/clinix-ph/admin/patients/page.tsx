import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { PatientDialog } from "@/src/components/clinic/patient-dialog";
import { PatientsPanel } from "@/src/components/clinic/patients-panel";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { listPatients } from "@/src/server/services/clinic-app";
import { listFieldDefinitions, visibleTo } from "@/src/server/services/patient-fields";

export const metadata: Metadata = { title: "Patients & records" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; view?: string }> }) {
  const { q, view } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.slice(0, 80) ?? "";
  const { clinic } = await requireActiveClinicOwner();
  const archivedView = view === "archived";
  const [{ rows, total }, definitions] = await Promise.all([listPatients(clinic.id, query, archivedView), listFieldDefinitions(clinic.id)]);
  const newPatientFields = visibleTo(clinic.role, definitions.filter((field) => !field.archived));

  return (
    <>
      <PageHeader title="Patients & records" description={`${total} ${total === 1 ? "record" : "records"} at ${clinic.name}.`} actions={!archivedView ? <PatientDialog customFields={newPatientFields} /> : undefined} />
      <PatientsPanel rows={rows} total={total} query={query} archivedView={archivedView} canWrite basePath={`${CLINIX_ROUTES.admin}/patients`} />
    </>
  );
}
