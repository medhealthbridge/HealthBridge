import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { requireUser } from "@/src/server/auth";
import { OnboardingWizard } from "./_components/onboarding-wizard";

// Heading options for the branding step's font pairing; not needed up front.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-playfair",
  preload: false,
});

export const metadata: Metadata = {
  title: "Set up your clinic — Clinix PH",
};

export default async function ClinixOnboardingPage() {
  await requireUser();

  return (
    <main
      className={`${poppins.variable} ${playfair.variable} flex min-h-dvh items-center justify-center bg-slate-50 p-4 font-text text-slate-900 sm:p-6`}
    >
      <OnboardingWizard />
    </main>
  );
}
