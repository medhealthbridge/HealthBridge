// Content of app/clinix-ph/app/[role]/inventory/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinic } from "@/src/server/auth";
import { InventoryPage } from "@/src/components/clinic/inventory-page";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";


export default async function PageView({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ view?: string }> }) {
  const { role } = await params;
  const { clinic } = await requireActiveClinic();
  return <InventoryPage clinic={clinic} basePath={`${roleHome(role)}/inventory`} archivedView={(await searchParams).view === "archived"} />;
}
