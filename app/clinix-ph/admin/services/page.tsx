import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminServicesView from "@/src/server/views/admin-services";

export const metadata: Metadata = { title: "Services & pricing" };

// Content lives in src/server/views/admin-services.tsx and is cached on the client by TanStack Query.
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AdminServicesView} view="admin/services" title={"Services & pricing"} gate={requireActiveClinicOwner} searchParams={searchParams} />;
}
