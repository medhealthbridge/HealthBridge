import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { ToastButton } from "@/src/components/console/toast";
import { ImportButton } from "../_components/import-button";
import { ServicesTable } from "./_components/services-table";

export const metadata: Metadata = { title: "Services & pricing" };

export default async function ServicesPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Price changes flow into booking, POS and reports immediately."
        actions={
          <>
            <ImportButton kind="services" />
            <ToastButton variant="primary" message="Opening the service editor">
              + Add service
            </ToastButton>
          </>
        }
      />
      <ServicesTable />
    </>
  );
}
