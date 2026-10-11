import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminOverviewView from "@/src/server/views/admin-overview";

// Content lives in src/server/views/admin-overview.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AdminOverviewView} view="admin/overview" title={"Overview"} gate={requireActiveClinicOwner} />;
}
