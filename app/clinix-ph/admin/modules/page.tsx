import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { ModuleGrid } from "@/src/components/console/module-grid";
import { PageHeader } from "@/src/components/console/page-header";
import { CLINIC_MODULES } from "@/src/lib/mock-data/clinix-admin";

export const metadata: Metadata = { title: "Modules" };

export default async function ModulesPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Modules" description="Turn features on for your account. Changes are logged." />
      <ModuleGrid modules={CLINIC_MODULES} stateLabels={["Active", "Not enabled"]} toastSuffixes={[" enabled", " disabled"]} />
    </>
  );
}
