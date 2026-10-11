import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminBillingView from "@/src/server/views/admin-billing";

export const metadata: Metadata = { title: "Billing" };

// Content lives in src/server/views/admin-billing.tsx and is cached on the client by TanStack Query.
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AdminBillingView} view="admin/billing" title={"Billing"} gate={requireActiveClinicOwner} searchParams={searchParams} />;
}
