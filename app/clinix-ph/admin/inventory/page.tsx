import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminInventoryView from "@/src/server/views/admin-inventory";

export const metadata: Metadata = { title: "Inventory" };

// Content lives in src/server/views/admin-inventory.tsx and is cached on the client by TanStack Query.
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AdminInventoryView} view="admin/inventory" title={"Inventory"} gate={requireActiveClinicOwner} searchParams={searchParams} />;
}
