import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppClaimsView from "@/src/server/views/app-claims";

export const metadata: Metadata = { title: "Claims & receivables" };

// Content lives in src/server/views/app-claims.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AppClaimsView} view="app/claims" title={"Claims & receivables"} gate={() => requireClinicRole("owner", "assistant")} />;
}
