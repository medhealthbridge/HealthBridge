import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { AuditLogList } from "@/src/components/console/audit-log-list";
import { PageHeader } from "@/src/components/console/page-header";
import { CLINIX_ACTIVITY } from "@/src/lib/mock-data/clinix-admin";

export const metadata: Metadata = { title: "Activity log" };

export default async function ActivityLogPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Activity log" description="Who did what, and who viewed which record." />
      <AuditLogList entries={CLINIX_ACTIVITY} />
    </>
  );
}
