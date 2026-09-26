import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { CLAIM_KPIS } from "@/src/lib/mock-data/clinix-admin";
import { ClaimsTable } from "./_components/claims-table";

export const metadata: Metadata = { title: "Claims & receivables" };

export default function ClaimsPage() {
  return (
    <>
      <PageHeader title="Claims & receivables" description="PhilHealth and HMO claims aged by payor." />
      <StatGrid stats={CLAIM_KPIS} />
      <ClaimsTable />
    </>
  );
}
