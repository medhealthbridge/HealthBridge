// Content of app/clinix-ph/admin/inventory/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { InventoryPage } from "@/src/components/clinic/inventory-page";
import { CLINIX_ROUTES } from "@/src/lib/constants";


export default async function PageView({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  return <InventoryPage clinic={clinic} basePath={`${CLINIX_ROUTES.admin}/inventory`} archivedView={(await searchParams).view === "archived"} />;
}
