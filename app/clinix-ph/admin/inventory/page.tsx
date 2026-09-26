import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { ToastButton } from "@/src/components/console/toast";
import { ImportButton } from "../_components/import-button";
import { InventoryTable } from "./_components/inventory-table";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock per branch with expiry and reorder thresholds."
        actions={
          <>
            <ImportButton kind="inventory" />
            <ToastButton message="Inventory export queued — check your email">Export CSV</ToastButton>
          </>
        }
      />
      <InventoryTable />
    </>
  );
}
