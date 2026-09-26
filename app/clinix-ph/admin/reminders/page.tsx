import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { REMINDER_KPIS } from "@/src/lib/mock-data/clinix-admin";
import { DeliveryTable } from "./_components/delivery-table";

export const metadata: Metadata = { title: "Reminders & delivery" };

export default async function RemindersPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Reminders & delivery" description="SMS, Viber and email sends with retry on failure." />
      <StatGrid stats={REMINDER_KPIS} />
      <DeliveryTable />
    </>
  );
}
