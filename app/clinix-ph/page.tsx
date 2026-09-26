import type { Metadata } from "next";
import ClinixLanding from "@/components/clinix-landing";

export const metadata: Metadata = {
  title: "Clinix PH — Multi-branch clinic management",
  description:
    "Patient records, appointments, billing, PhilHealth and HMO claims, and stock in one place — with senior-citizen and PWD discounts computed correctly, every time.",
};

export default function ClinixPhPage() {
  return <ClinixLanding />;
}
