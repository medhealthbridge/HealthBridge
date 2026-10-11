import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminStaffView from "@/src/server/views/admin-staff";

export const metadata: Metadata = { title: "Staff & roles" };

// Content lives in src/server/views/admin-staff.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AdminStaffView} view="admin/staff" title={"Staff & roles"} gate={requireActiveClinicOwner} />;
}
