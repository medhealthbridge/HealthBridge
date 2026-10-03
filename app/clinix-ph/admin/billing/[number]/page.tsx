import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { ReceiptView } from "@/src/components/clinic/receipt-view";
import { VoidInvoiceButton } from "@/src/components/clinic/void-invoice-button";
import { findInvoice } from "@/src/server/services/billing";

export const metadata: Metadata = { title: "Receipt" };

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const { clinic } = await requireActiveClinicOwner();
  const invoice = await findInvoice(clinic.id, decodeURIComponent(number));
  if (!invoice) notFound();
  return (
    <>
      <PageHeader title={invoice.invoiceNumber} actions={invoice.status === "void" ? undefined : <VoidInvoiceButton invoiceId={invoice.id} number={invoice.invoiceNumber} />} />
      <ReceiptView invoice={invoice} clinicName={clinic.name} timezone={clinic.timezone} />
    </>
  );
}
