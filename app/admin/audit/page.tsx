import type { Metadata } from "next";
import { AuditLogList } from "@/src/components/console/audit-log-list";
import { PageHeader } from "@/src/components/console/page-header";
import { COMPANY_AUDIT } from "@/src/lib/mock-data/company-admin";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <>
      <PageHeader title="Audit log" description="Every privileged platform action, attributable to a named admin." />
      <AuditLogList entries={COMPANY_AUDIT} />
    </>
  );
}
