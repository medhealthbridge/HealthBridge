import type { Metadata } from "next";
import { requireWorkspace } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { ClinicProfileCard } from "./_components/clinic-profile-card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();

  return (
    <>
      <PageHeader title="Settings" description="Clinic profile, as set up during onboarding." />
      {workspace.clinics.map((clinic) => (
        <ClinicProfileCard key={clinic.id} clinic={clinic} />
      ))}
    </>
  );
}
