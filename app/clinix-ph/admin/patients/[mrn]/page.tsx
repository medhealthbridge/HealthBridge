import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PatientDental } from "@/src/components/clinic/patient-dental";
import { PatientChartView } from "@/src/components/clinic/patient-chart";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { openPatientChart } from "@/src/server/services/clinic-app";
import { listClinicalNotes } from "@/src/server/services/clinical-notes";
import { patientFieldsForChart } from "@/src/server/services/patient-fields";

export const metadata: Metadata = { title: "Patient" };

export default async function PatientPage({ params, searchParams }: { params: Promise<{ mrn: string }>; searchParams: Promise<{ view?: string }> }) {
  const { mrn } = await params;
  const { user, clinic } = await requireActiveClinicOwner();
  const chart = await openPatientChart(clinic.id, user.id, decodeURIComponent(mrn), (await searchParams).view === "archived");
  if (!chart) notFound();
  // Clinical notes are for the doctors (owner, practitioner); the front desk never sees them.
  const seesNotes = clinic.role !== "assistant";
  const notes = seesNotes ? await listClinicalNotes(clinic, chart.patient.id) : null;

  const customFields = await patientFieldsForChart(clinic, chart.patient.id);
  return <PatientChartView chart={chart} backHref={`${CLINIX_ROUTES.admin}/patients`} canWrite notes={notes} canWriteNotes canInvite customFields={customFields} dental={<PatientDental clinic={clinic} patientId={chart.patient.id} archived={chart.patient.archived} billingHref={`${CLINIX_ROUTES.admin}/billing`} />} />;
}
