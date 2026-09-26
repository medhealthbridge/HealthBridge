import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { CurrentPlanCard } from "./_components/current-plan-card";
import { InvoiceHistoryTable } from "./_components/invoice-history-table";

export const metadata: Metadata = { title: "Subscription" };

export default async function SubscriptionPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Subscription" description="Your plan, invoices and branch allowance." />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1.9fr_1fr]">
        <InvoiceHistoryTable />
        <CurrentPlanCard />
      </div>
    </>
  );
}
