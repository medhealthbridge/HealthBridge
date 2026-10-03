import { Pill } from "@/src/components/console/pill";
import { Panel } from "@/src/components/console/panel";
import { DISCOUNT_LABELS, PAYMENT_LABELS, type PaymentMethod } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";
import type { InvoiceDetail } from "@/src/server/services/billing";

const peso = (cents: number) => formatPesoExact(cents / 100);

export function ReceiptView({ invoice, clinicName, timezone }: { invoice: InvoiceDetail; clinicName: string; timezone: string }) {
  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: timezone });
  return (
    <Panel className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-extrabold">{clinicName}</p>
          <p className="text-[13px] text-console-muted">Official receipt {invoice.invoiceNumber}</p>
          {invoice.issuedAt && <p className="text-xs text-console-muted">{when.format(invoice.issuedAt)}</p>}
        </div>
        <Pill tone={invoice.status === "void" ? "danger" : "accent"}>{invoice.status === "void" ? "Void" : "Paid"}</Pill>
      </div>
      <p className="text-[13px]">{invoice.patientName} <span className="text-console-muted">{invoice.patientMrn}</span></p>
      {invoice.status === "void" && (
        <p role="note" className="rounded-lg border border-console-danger/40 bg-console-danger/10 px-3 py-2 text-xs">
          Voided{invoice.voidedAt ? ` on ${when.format(invoice.voidedAt)}` : ""}. Reason: {invoice.voidReason}
        </p>
      )}
      <table aria-label="Items" className="w-full text-[13px]">
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index} className="border-b border-console-line">
              <td className="py-1.5 pr-2">{line.description}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</td>
              <td className="py-1.5 text-right">{peso(line.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="flex flex-col gap-1 text-[13px]">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(invoice.subtotalCents)}</dd></div>
        {invoice.vatExemptCents > 0 && <div className="flex justify-between"><dt>Less VAT (exempt sale)</dt><dd>−{peso(invoice.vatExemptCents)}</dd></div>}
        {invoice.discountCents > 0 && <div className="flex justify-between"><dt>{DISCOUNT_LABELS[invoice.discountType]} · ID {invoice.discountIdNumber}</dt><dd>−{peso(invoice.discountCents)}</dd></div>}
        {invoice.vatCents > 0 && <div className="flex justify-between text-console-muted"><dt>VAT included</dt><dd>{peso(invoice.vatCents)}</dd></div>}
        <div className="flex justify-between border-t border-console-line pt-1 text-base font-extrabold"><dt>Total</dt><dd>{peso(invoice.totalCents)}</dd></div>
      </dl>
      {invoice.payments.map((payment, index) => (
        <p key={index} className="text-xs text-console-muted">
          Paid {peso(payment.amountCents)} by {PAYMENT_LABELS[payment.method as PaymentMethod] ?? payment.method}{payment.referenceNumber ? ` · ref ${payment.referenceNumber}` : ""}
        </p>
      ))}
    </Panel>
  );
}
