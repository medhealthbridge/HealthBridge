import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { QUEUE, QUEUE_STATUS_TONE } from "@/src/lib/mock-data/clinix-admin";

export function QueueTable() {
  return (
    <TableCard label="Today's queue">
      <thead>
        <tr>
          <Th>Time</Th>
          <Th>Ticket</Th>
          <Th>Patient</Th>
          <Th>Service</Th>
          <Th>Practitioner</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {QUEUE.map((entry) => (
          <Tr key={entry.ticket}>
            <Td className="font-data text-console-accent">{entry.time}</Td>
            <Td className="font-data text-[11px] text-console-subtle">{entry.ticket}</Td>
            <Td className="font-semibold">{entry.patient}</Td>
            <Td className="text-console-muted">{entry.service}</Td>
            <Td className="text-console-muted">{entry.practitioner}</Td>
            <Td>
              <Pill tone={QUEUE_STATUS_TONE[entry.status]}>{entry.status}</Pill>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
