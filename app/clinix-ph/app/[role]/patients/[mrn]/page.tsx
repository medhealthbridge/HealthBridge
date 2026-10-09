import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinic } from "@/src/server/auth";
import { ageOf } from "@/src/components/clinic/patients-panel";
import { PatientDental } from "@/src/components/clinic/patient-dental";
import { PatientChartView } from "@/src/components/clinic/patient-chart";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { openPatientChart } from "@/src/server/services/clinic-app";
import { listClinicalNotes } from "@/src/server/services/clinical-notes";
import { patientFieldsForChart } from "@/src/server/services/patient-fields";

export const metadata: Metadata = { title: "Patient" };

export default async function PatientPage({ params, searchParams }: { params: Promise<{ role: AppRole; mrn: string }>; searchParams: Promise<{ view?: string }> }) {
  const { role, mrn } = await params;
  const { user, clinic } = await requireActiveClinic();
  const canWrite = clinic.role !== "practitioner";
  const chart = await openPatientChart(clinic.id, user.id, decodeURIComponent(mrn), canWrite && (await searchParams).view === "archived");
  if (!chart) notFound();
  // Clinical notes are for the doctors (owner, practitioner); the front desk never sees them.
  const seesNotes = clinic.role !== "assistant";
  const notes = seesNotes ? await listClinicalNotes(clinic, chart.patient.id) : null;

  const customFields = await patientFieldsForChart(clinic, chart.patient.id);
  return <PatientChartView chart={chart} backHref={`${roleHome(role)}/patients`} canWrite={canWrite} notes={notes} canWriteNotes={seesNotes} canInvite={clinic.role !== "practitioner"} customFields={customFields} dental={<PatientDental clinic={clinic} patientId={chart.patient.id} archived={chart.patient.archived} age={ageOf(chart.patient.dateOfBirth)} billingHref={`${roleHome(role)}/billing`} />} />;
}
