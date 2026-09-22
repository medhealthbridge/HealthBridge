import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import ClinixLanding from "@/components/clinix-landing";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Clinix PH — Multi-branch clinic management",
  description:
    "Patient records, appointments, billing, PhilHealth and HMO claims, and stock in one place — with senior-citizen and PWD discounts computed correctly, every time.",
};

export default function ClinixPhPage() {
  return (
    <div
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <ClinixLanding />
    </div>
  );
}
