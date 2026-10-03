import Link from "next/link";
import { Pill } from "@/src/components/console/pill";
import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { PAYMENT_LABELS, type PaymentMethod } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";
import type { InvoiceSummary } from "@/src/server/services/billing";

export function ReceiptsTable({ rows, basePath, timezone }: { rows: InvoiceSummary[]; basePath: string; timezone: string }) {
  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-console-line p-6 text-center text-[13px] text-console-muted">No receipts yet. Use <strong>New checkout</strong> when a patient pays.</p>;
  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  return (
    <TableCard label="Receipts">
      <thead>
        <tr><Th>Receipt</Th><Th>Patient</Th><Th>Date</Th><Th>Paid by</Th><Th numeric>Total</Th><Th>Status</Th></tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.id}>
            <Td><Link href={`${basePath}/${row.invoiceNumber}`} className="font-semibold text-console-accent underline">{row.invoiceNumber}</Link></Td>
            <Td>{row.patientName} <span className="text-console-muted">{row.patientMrn}</span></Td>
            <Td className="whitespace-nowrap">{row.issuedAt ? when.format(row.issuedAt) : "—"}</Td>
            <Td>{row.method ? PAYMENT_LABELS[row.method as PaymentMethod] ?? row.method : "—"}</Td>
            <Td numeric className={row.status === "void" ? "line-through" : ""}>{formatPesoExact(row.totalCents / 100)}</Td>
            <Td><Pill tone={row.status === "void" ? "danger" : "accent"}>{row.status === "void" ? "Void" : "Paid"}</Pill></Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
