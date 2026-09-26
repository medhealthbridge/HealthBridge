import type { Metadata } from "next";
import { AuditLogList } from "@/src/components/console/audit-log-list";
import { PageHeader } from "@/src/components/console/page-header";
import { CLINIX_ACTIVITY } from "@/src/lib/mock-data/clinix-admin";

export const metadata: Metadata = { title: "Activity log" };

export default function ActivityLogPage() {
  return (
    <>
      <PageHeader title="Activity log" description="Who did what, and who viewed which record." />
      <AuditLogList entries={CLINIX_ACTIVITY} />
    </>
  );
}
