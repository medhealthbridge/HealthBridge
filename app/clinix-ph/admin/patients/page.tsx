import type { Metadata } from "next";
import { PATIENTS } from "@/src/lib/mock-data/clinix-admin";
import { PatientsDirectory } from "./_components/patients-directory";

export const metadata: Metadata = { title: "Patients & records" };

export default function PatientsPage() {
  return <PatientsDirectory patients={PATIENTS} />;
}
