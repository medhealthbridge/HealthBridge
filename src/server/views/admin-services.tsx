// Content of app/clinix-ph/admin/services/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { listServices } from "@/src/server/services/price-list";
import { ServiceDialog } from "@/app/clinix-ph/admin/services/_components/service-dialog";
import { ServicesTable } from "@/app/clinix-ph/admin/services/_components/services-table";


export default async function ServicesPageView({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
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
