import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { PENDING_REQUESTS } from "@/src/lib/mock-data/clinix-admin";
import { PendingConfirmations } from "./_components/pending-confirmations";
import { QueueTable } from "./_components/queue-table";

export const metadata: Metadata = { title: "Appointments & queue" };

export default async function AppointmentsPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Appointments & queue" description="Confirm pending requests before the slot is locked." />
      <PendingConfirmations requests={PENDING_REQUESTS} />
      <QueueTable />
    </>
  );
}
