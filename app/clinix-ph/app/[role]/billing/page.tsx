import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppBillingView from "@/src/server/views/app-billing";

export const metadata: Metadata = { title: "Billing" };

// Content lives in src/server/views/app-billing.tsx and is cached on the client by TanStack Query.
export default function Page({ params, searchParams }: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AppBillingView} view="app/billing" title={"Billing"} gate={() => requireClinicRole("owner", "assistant")} params={params} searchParams={searchParams} />;
}
