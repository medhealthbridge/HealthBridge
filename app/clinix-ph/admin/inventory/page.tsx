import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { InventoryPage } from "@/src/components/clinic/inventory-page";
import { CLINIX_ROUTES } from "@/src/lib/constants";

export const metadata: Metadata = { title: "Inventory" };

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  return <InventoryPage clinic={clinic} basePath={`${CLINIX_ROUTES.admin}/inventory`} archivedView={(await searchParams).view === "archived"} />;
}
