import type { Metadata } from "next";
import { requireUser } from "@/src/server/auth";
import { PhoneApp } from "./_components/phone-app";

export const metadata: Metadata = {
  title: "Clinic app · Clinix PH",
  description: "Today's floor work — queue, patients, charging and bookings.",
  robots: { index: false },
};

/**
 * The phone app. Signed in and verified is the whole gate here: the screens
 * run on demo data, and the real per-clinic authorization lives with the
 * services that will back them (see `requireClinicOwner` for the console).
 */
export default async function ClinixPhoneAppPage() {
  await requireUser();
  return <PhoneApp />;
}
