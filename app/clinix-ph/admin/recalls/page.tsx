import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminRecallsView from "@/src/server/views/admin-recalls";

export const metadata: Metadata = { title: "Recalls" };

// Content lives in src/server/views/admin-recalls.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AdminRecallsView} view="admin/recalls" title={"Recalls"} gate={requireActiveClinicOwner} />;
}
