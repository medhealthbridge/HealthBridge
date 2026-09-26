import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { SEVERITY_TONE, SUPPORT_TICKETS, TICKET_STATUS_TONE } from "@/src/lib/mock-data/company-admin";

export function TicketsTable() {
  return (
    <TableCard label="Support tickets">
      <thead>
        <tr>
          <Th>Tenant</Th>
          <Th>Ticket</Th>
          <Th>Severity</Th>
          <Th>Status</Th>
          <Th>Opened</Th>
        </tr>
      </thead>
      <tbody>
        {SUPPORT_TICKETS.map((ticket) => (
          <Tr key={ticket.subject}>
            <Td className="font-semibold">{ticket.tenant}</Td>
            <Td className="text-console-muted">{ticket.subject}</Td>
            <Td>
              <Pill tone={SEVERITY_TONE[ticket.severity]}>{ticket.severity}</Pill>
            </Td>
            <Td>
              <Pill tone={TICKET_STATUS_TONE[ticket.status]}>{ticket.status}</Pill>
            </Td>
            <Td className="font-data text-xs text-console-subtle">{ticket.opened}</Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
