import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { ExportCards } from "./_components/export-cards";
import { ImportCards } from "./_components/import-cards";

export const metadata: Metadata = { title: "Import / Export" };

export default async function ImportExportPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader title="Import / Export" description="Owner-only. All actions are logged in the Activity log." />
      <ImportCards />
      <ExportCards />
    </>
  );
}
