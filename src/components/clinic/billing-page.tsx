import { PageHeader } from "@/src/components/console/page-header";
import { CheckoutDialog } from "@/src/components/clinic/checkout-dialog";
import { ReceiptsTable } from "@/src/components/clinic/receipts-table";
import { listPatients, type StaffClinic } from "@/src/server/services/clinic-app";
import { listInvoices } from "@/src/server/services/billing";
import { listServices } from "@/src/server/services/price-list";

/** Shared by the owner console and the front-desk app: same data, same rules. */
export async function BillingPage({ clinic, basePath }: { clinic: StaffClinic; basePath: string }) {
  const [rows, services, { rows: patients }] = await Promise.all([listInvoices(clinic.id), listServices(clinic.id), listPatients(clinic.id, "", false)]);
  return (
    <>
      <PageHeader
        title="Billing"
        description="Take payment and issue official receipts."
        actions={
          <CheckoutDialog
            receiptsPath={basePath}
            patients={patients.map((p) => ({ id: p.id, label: `${p.name} · ${p.mrn}` }))}
            services={services.map((s) => ({ id: s.id, name: s.name, priceCentavos: s.priceCentavos, vatExempt: s.vatExempt }))}
          />
        }
      />
      <ReceiptsTable rows={rows} basePath={basePath} timezone={clinic.timezone} />
    </>
  );
}
