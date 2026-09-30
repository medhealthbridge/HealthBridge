import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { requireOnboardingPending } from "@/src/server/auth";
import { SignOutButton } from "@/src/components/sign-out-button";
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
  const user = await requireOnboardingPending();

  return (
    <main
      className={`${poppins.variable} ${playfair.variable} flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 p-4 font-text text-slate-900 sm:p-6`}
    >
      <p className="flex w-full max-w-[720px] items-center justify-end gap-1 text-xs text-slate-600">
        Signed in as <span className="font-semibold text-slate-900">{user.email}</span>
        <span aria-hidden="true">·</span>
        <SignOutButton className="min-h-11 cursor-pointer px-1 font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          Log out
        </SignOutButton>
      </p>
      <OnboardingWizard />
    </main>
  );
}
