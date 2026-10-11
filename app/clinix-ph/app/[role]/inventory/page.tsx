import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppInventoryView from "@/src/server/views/app-inventory";

export const metadata: Metadata = { title: "Inventory" };

// Content lives in src/server/views/app-inventory.tsx and is cached on the client by TanStack Query.
export default function Page({ params, searchParams }: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AppInventoryView} view="app/inventory" title={"Inventory"} gate={requireActiveClinic} params={params} searchParams={searchParams} />;
}
