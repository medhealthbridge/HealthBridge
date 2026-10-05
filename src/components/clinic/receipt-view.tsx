import { Pill } from "@/src/components/console/pill";
import { Panel } from "@/src/components/console/panel";
import { PAYMENT_LABELS, type PaymentMethod } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";
import type { InvoiceDetail } from "@/src/server/services/billing";

const peso = (cents: number) => formatPesoExact(cents / 100);
const INSTALLMENT_TONE = { paid: "accent", partial: "warn", due: "warn", overdue: "danger", upcoming: "neutral" } as const;
const INSTALLMENT_LABEL = { paid: "Paid", partial: "Part paid", due: "Due today", overdue: "Overdue", upcoming: "Upcoming" } as const;

export function ReceiptView({ invoice, clinicName, timezone }: { invoice: InvoiceDetail; clinicName: string; timezone: string }) {
  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: timezone });
  const day = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" });
  const open = invoice.status === "open";
  return (
    <Panel className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-extrabold">{clinicName}</p>
          <p className="text-[13px] text-console-muted">Receipt {invoice.invoiceNumber}</p>
          {invoice.issuedAt && <p className="text-xs text-console-muted">{when.format(invoice.issuedAt)}</p>}
        </div>
        <Pill tone={invoice.status === "void" ? "danger" : open ? "warn" : "accent"}>{invoice.status === "void" ? "Void" : open ? "On account" : "Paid"}</Pill>
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
              <td className="py-1.5 pr-2">{line.description}{line.tooth ? ` · #${line.tooth}` : ""}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</td>
              <td className="py-1.5 text-right">{peso(line.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="flex flex-col gap-1 text-[13px]">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(invoice.subtotalCents)}</dd></div>
        {invoice.vatExemptCents > 0 && <div className="flex justify-between"><dt>Less VAT (exempt sale)</dt><dd>−{peso(invoice.vatExemptCents)}</dd></div>}
        {invoice.discountCents > 0 && <div className="flex justify-between"><dt>{invoice.discountLabel ?? "Discount"}{invoice.discountIdNumber ? ` · ID ${invoice.discountIdNumber}` : ""}</dt><dd>−{peso(invoice.discountCents)}</dd></div>}
        {invoice.vatCents > 0 && <div className="flex justify-between text-console-muted"><dt>VAT included</dt><dd>{peso(invoice.vatCents)}</dd></div>}
        <div className="flex justify-between border-t border-console-line pt-1 text-base font-extrabold"><dt>Total</dt><dd>{peso(invoice.totalCents)}</dd></div>
        {invoice.status !== "void" && <div className="flex justify-between"><dt>Paid</dt><dd>{peso(invoice.paidCents)}</dd></div>}
        {open && <div className="flex justify-between font-extrabold text-console-warn"><dt>Balance</dt><dd>{peso(invoice.balanceCents)}</dd></div>}
      </dl>

      {invoice.payments.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wide text-console-subtle uppercase">Payments</h3>
          <ul className="divide-y divide-console-line text-[13px]">
            {invoice.payments.map((payment, index) => (
              <li key={index} className="flex items-center justify-between gap-3 py-1.5">
                <span>
                  <span className="font-semibold">{payment.receiptNumber ?? "Payment"}</span>
                  <span className="block text-xs text-console-muted">{when.format(payment.paidAt)} · {PAYMENT_LABELS[payment.method as PaymentMethod] ?? payment.method}{payment.referenceNumber ? ` · ref ${payment.referenceNumber}` : ""}</span>
                </span>
                <span>{peso(payment.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {invoice.installments.length > 0 && invoice.status !== "void" && (
        <div>
          <h3 className="mb-1 text-xs font-bold tracking-wide text-console-subtle uppercase">Installments</h3>
          <ul className="divide-y divide-console-line text-[13px]">
            {invoice.installments.map((item) => (
              <li key={item.sequence} className="flex items-center justify-between gap-3 py-1.5">
                <span>{item.sequence}. {day.format(new Date(`${item.dueOn}T00:00:00Z`))}</span>
                <span className="flex items-center gap-2">{peso(item.amountCents)} <Pill tone={INSTALLMENT_TONE[item.state]}>{INSTALLMENT_LABEL[item.state]}</Pill></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
