import type { Metadata } from "next";
import { requireWorkspace } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { getClinicDomainOrder } from "@/src/server/services/domain-orders";
import { DomainStatusCard } from "./_components/domain-status-card";
import { ClinicProfileCard } from "./_components/clinic-profile-card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { workspace } = await requireWorkspace();

  return (
    <>
      <PageHeader title="Settings" description="Clinic profile, as set up during onboarding." />
      {await Promise.all(
        workspace.clinics.map(async (clinic) => (
          <div key={clinic.id} className="flex flex-col gap-4">
            <ClinicProfileCard clinic={clinic} />
            <DomainStatusCard order={await getClinicDomainOrder(clinic.id)} />
          </div>
        )),
      )}
    </>
  );
}
