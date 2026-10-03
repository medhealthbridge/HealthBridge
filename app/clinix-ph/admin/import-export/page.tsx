import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { PageHeader } from "@/src/components/console/page-header";
import { PatientImport } from "@/src/components/clinic/patient-import";
import { TransferCard } from "./_components/transfer-card";

export const metadata: Metadata = { title: "Import / Export" };

const EXPORTS = [
  { kind: "patients", title: "Patients", desc: "Names, birth dates, contact and ID numbers. Contains personal data; store it safely." },
  { kind: "receipts", title: "Receipts", desc: "Every official receipt with date, patient, payment method, total and status (void included)." },
  { kind: "inventory", title: "Inventory", desc: "Items with stock on hand, reorder levels and next expiry." },
  { kind: "claims", title: "Claims", desc: "PhilHealth and HMO claims with payor, amount, status and dates." },
] as const;

export default async function ImportExportPage() {
  await requireActiveClinicOwner();

  return (
    <>
      <PageHeader title="Import / Export" description="Owner-only. Every export is logged in the Activity log." />
      <PatientImport />
      <section aria-label="Export" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {EXPORTS.map((item) => (
          <TransferCard
            key={item.kind}
            kicker="Export"
            title={item.title}
            desc={item.desc}
            action={<a href={`/api/clinic/export?kind=${item.kind}`} className={consoleButtonClass("secondary", "md")} download>Download CSV</a>}
          />
        ))}
      </section>
    </>
  );
}
