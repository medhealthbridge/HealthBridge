import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PatientChartView } from "@/src/components/clinic/patient-chart";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { openPatientChart } from "@/src/server/services/clinic-app";

export const metadata: Metadata = { title: "Patient" };

export default async function PatientPage({ params, searchParams }: { params: Promise<{ mrn: string }>; searchParams: Promise<{ view?: string }> }) {
  const { mrn } = await params;
  const { user, clinic } = await requireActiveClinicOwner();
  const chart = await openPatientChart(clinic.id, user.id, decodeURIComponent(mrn), (await searchParams).view === "archived");
  if (!chart) notFound();

  return <PatientChartView chart={chart} backHref={`${CLINIX_ROUTES.admin}/patients`} canWrite />;
}
