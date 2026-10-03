import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { listServices } from "@/src/server/services/price-list";
import { ServiceDialog } from "./_components/service-dialog";
import { ServicesTable } from "./_components/services-table";

export const metadata: Metadata = { title: "Services & pricing" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  const archivedView = (await searchParams).view === "archived";
  const rows = await listServices(clinic.id, { archived: archivedView });

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description={`${clinic.name}'s price list. Prices are in pesos; senior and PWD discounts are applied at checkout.`}
        actions={!archivedView ? <ServiceDialog /> : undefined}
      />
      <ServicesTable rows={rows} archivedView={archivedView} />
    </>
  );
}
