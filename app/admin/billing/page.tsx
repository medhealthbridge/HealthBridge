import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { BILLING_KPIS } from "@/src/lib/mock-data/company-admin";
import { SubscriptionsTable } from "./_components/subscriptions-table";

export const metadata: Metadata = { title: "Billing & revenue" };

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Billing & revenue" />
      <StatGrid stats={BILLING_KPIS} />
      <SubscriptionsTable />
    </>
  );
}
