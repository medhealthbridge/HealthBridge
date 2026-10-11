import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminActivityView from "@/src/server/views/admin-activity";

export const metadata: Metadata = { title: "Activity log" };

// Content lives in src/server/views/admin-activity.tsx and is cached on the client by TanStack Query.
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AdminActivityView} view="admin/activity" title={"Activity log"} gate={requireActiveClinicOwner} searchParams={searchParams} />;
}
