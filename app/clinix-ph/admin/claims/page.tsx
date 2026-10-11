import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminClaimsView from "@/src/server/views/admin-claims";

export const metadata: Metadata = { title: "Claims & receivables" };

// Content lives in src/server/views/admin-claims.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AdminClaimsView} view="admin/claims" title={"Claims & receivables"} gate={requireActiveClinicOwner} />;
}
