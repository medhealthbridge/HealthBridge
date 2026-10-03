import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { InventoryPage } from "@/src/components/clinic/inventory-page";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";

export const metadata: Metadata = { title: "Inventory" };

export default async function Page({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ view?: string }> }) {
  const { role } = await params;
  const { clinic } = await requireActiveClinic();
  return <InventoryPage clinic={clinic} basePath={`${roleHome(role)}/inventory`} archivedView={(await searchParams).view === "archived"} />;
}
