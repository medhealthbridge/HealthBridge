import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { INVOICE_STATUS_TONE, SUBSCRIPTION_INVOICES } from "@/src/lib/mock-data/clinix-admin";
import { formatPeso } from "@/src/lib/utils";

export function InvoiceHistoryTable() {
  return (
    <TableCard label="Invoice history" header={<PanelHeader title="Invoice history" />}>
      <thead>
        <tr>
          <Th>Invoice</Th>
          <Th>Period</Th>
          <Th numeric>Amount</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {SUBSCRIPTION_INVOICES.map((invoice) => (
          <Tr key={invoice.id}>
            <Td className="font-data text-xs">{invoice.id}</Td>
            <Td className="text-console-muted">{invoice.period}</Td>
            <Td numeric>{formatPeso(invoice.amount)}</Td>
            <Td>
              <Pill tone={INVOICE_STATUS_TONE[invoice.status]}>{invoice.status}</Pill>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
