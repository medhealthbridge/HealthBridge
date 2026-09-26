import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { DELIVERY_KPIS } from "@/src/lib/mock-data/company-admin";
import { TicketsTable } from "./_components/tickets-table";

export const metadata: Metadata = { title: "Support & delivery" };

export default function SupportPage() {
  return (
    <>
      <PageHeader title="Support & delivery health" />
      <StatGrid stats={DELIVERY_KPIS} />
      <TicketsTable />
    </>
  );
}
