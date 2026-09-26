import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { ToastButton } from "@/src/components/console/toast";
import { DELIVERIES, DELIVERY_STATUS_TONE } from "@/src/lib/mock-data/clinix-admin";

export function DeliveryTable() {
  return (
    <TableCard label="Message deliveries">
      <thead>
        <tr>
          <Th>Channel</Th>
          <Th>Recipient</Th>
          <Th>Template</Th>
          <Th>Status</Th>
          <Th>Sent</Th>
          <Th className="w-24">
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {DELIVERIES.map((delivery) => (
          <Tr key={`${delivery.channel}-${delivery.to}`}>
            <Td>
              <Pill tone="info">{delivery.channel}</Pill>
            </Td>
            <Td className="font-data text-xs">{delivery.to}</Td>
            <Td className="text-console-muted">{delivery.template}</Td>
            <Td>
              <Pill tone={DELIVERY_STATUS_TONE[delivery.status]}>{delivery.status}</Pill>
            </Td>
            <Td className="font-data text-xs text-console-subtle">{delivery.sent}</Td>
            <Td>
              {delivery.status === "Failed" && (
                <ToastButton size="sm" message={`Retry queued · ${delivery.to}`} aria-label={`Retry ${delivery.channel} to ${delivery.to}`}>
                  Retry
                </ToastButton>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
