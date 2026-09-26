import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PATIENTS } from "@/src/lib/mock-data/clinix-admin";
import { PatientsDirectory } from "./_components/patients-directory";

export const metadata: Metadata = { title: "Patients & records" };

export default async function PatientsPage() {
  await requireClinicOwner();

  return <PatientsDirectory patients={PATIENTS} />;
}
