import Link from "next/link";
import { PageHeader } from "@/src/components/console/page-header";
import { StatGrid } from "@/src/components/console/stat-grid";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { CheckoutDialog } from "@/src/components/clinic/checkout-dialog";
import { ReceiptsTable } from "@/src/components/clinic/receipts-table";
import { formatPeso } from "@/src/lib/utils";
import { clinicDateString, listPatients, type StaffClinic } from "@/src/server/services/clinic-app";
import { listInvoices, receivablesSummary } from "@/src/server/services/billing";
import { listDiscountTypes } from "@/src/server/services/discount-types";
import { listBillablePlanItems } from "@/src/server/services/treatment-plans";
import { listServices } from "@/src/server/services/price-list";

/** Shared by the owner console and the front-desk app: same data, same rules. */
export async function BillingPage({ clinic, basePath, view }: { clinic: StaffClinic; basePath: string; view?: string }) {
  const onAccount = view === "balances";
  const [rows, services, { rows: patients }, planItems, discounts, owed] = await Promise.all([
    listInvoices(clinic.id, { openOnly: onAccount }),
    listServices(clinic.id),
    listPatients(clinic.id, "", false),
    listBillablePlanItems(clinic.id),
    listDiscountTypes(clinic.id),
    receivablesSummary(clinic.id, clinic.timezone),
  ]);
  return (
    <>
      <PageHeader
        title="Billing"
        description="Take payment, put it on account, and issue receipts."
        actions={
          <CheckoutDialog
            receiptsPath={basePath}
            today={clinicDateString(clinic.timezone)}
            canCustomDiscount={clinic.role === "owner"}
            patients={patients.map((p) => ({ id: p.id, label: `${p.name} · ${p.mrn}` }))}
            services={services.map((s) => ({ id: s.id, name: s.name, priceCentavos: s.priceCentavos, vatExempt: s.vatExempt }))}
            planItems={planItems}
            discounts={discounts.map((d) => ({ id: d.id, name: d.name, kind: d.kind, value: d.value, requiresId: d.requiresId }))}
          />
        }
      />
      <StatGrid
        stats={[
          { label: "On account", value: formatPeso(owed.owedCents / 100), sub: `${owed.openCount} open ${owed.openCount === 1 ? "receipt" : "receipts"}`, tone: owed.owedCents > 0 ? "warn" : "neutral" },
          { label: "Overdue installments", value: String(owed.overdueCount), sub: "Receipts with a missed due date", tone: owed.overdueCount > 0 ? "danger" : "neutral" },
        ]}
        columns={3}
      />
      <nav aria-label="Receipts view" className="flex flex-wrap gap-1.5">
        <Link href={basePath} aria-current={!onAccount ? "page" : undefined} className={consoleButtonClass(!onAccount ? "primary" : "secondary", "sm")}>All receipts</Link>
        <Link href={`${basePath}?view=balances`} aria-current={onAccount ? "page" : undefined} className={consoleButtonClass(onAccount ? "primary" : "secondary", "sm")}>On account</Link>
      </nav>
      <ReceiptsTable rows={rows} basePath={basePath} timezone={clinic.timezone} emptyText={onAccount ? "Nothing on account. Every receipt is fully paid." : undefined} />
    </>
  );
}
