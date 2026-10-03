import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinic } from "@/src/server/auth";
import { PatientChartView } from "@/src/components/clinic/patient-chart";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";
import { openPatientChart } from "@/src/server/services/clinic-app";

export const metadata: Metadata = { title: "Patient" };

export default async function PatientPage({ params, searchParams }: { params: Promise<{ role: AppRole; mrn: string }>; searchParams: Promise<{ view?: string }> }) {
  const { role, mrn } = await params;
  const { user, clinic } = await requireActiveClinic();
  const canWrite = clinic.role !== "practitioner";
  const chart = await openPatientChart(clinic.id, user.id, decodeURIComponent(mrn), canWrite && (await searchParams).view === "archived");
  if (!chart) notFound();

  return <PatientChartView chart={chart} backHref={`${roleHome(role)}/patients`} canWrite={canWrite} />;
}
