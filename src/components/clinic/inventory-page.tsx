import { PageHeader } from "@/src/components/console/page-header";
import { InventoryPanel } from "@/src/components/clinic/inventory-panel";
import { ItemDialog } from "@/src/components/clinic/item-dialog";
import { clinicDateString, type StaffClinic } from "@/src/server/services/clinic-app";
import { listInventory } from "@/src/server/services/inventory";

/** Shared by the owner console and the staff app: same data, role decides the controls. */
export async function InventoryPage({ clinic, basePath, archivedView }: { clinic: StaffClinic; basePath: string; archivedView: boolean }) {
  const canManage = clinic.role === "owner";
  const rows = await listInventory(clinic.id, clinicDateString(clinic.timezone), { archived: archivedView && canManage });
  const attention = rows.filter((row) => row.status !== "ok" || row.expiredQty > 0).length;
  return (
    <>
      <PageHeader
        title="Inventory"
        description={archivedView ? "Archived items." : attention > 0 ? `${attention} ${attention === 1 ? "item needs" : "items need"} attention.` : "Supplies on hand, with reorder levels and expiry."}
        actions={canManage && !archivedView ? <ItemDialog /> : undefined}
      />
      <InventoryPanel rows={rows} basePath={basePath} canManage={canManage} archivedView={archivedView && canManage} />
    </>
  );
}
