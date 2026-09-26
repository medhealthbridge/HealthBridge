import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { LAST_BILLING_EVENT, TENANT_STATUS_TONE, TENANTS } from "@/src/lib/mock-data/company-admin";
import { formatPeso } from "@/src/lib/utils";

export function SubscriptionsTable() {
  return (
    <TableCard label="Subscriptions">
      <thead>
        <tr>
          <Th>Account</Th>
          <Th>Tier</Th>
          <Th>Status</Th>
          <Th numeric>MRR</Th>
          <Th>Next charge</Th>
          <Th>Last event</Th>
        </tr>
      </thead>
      <tbody>
        {TENANTS.map((tenant) => (
          <Tr key={tenant.key}>
            <Td className="font-semibold">{tenant.name}</Td>
            <Td>
              <Pill>{tenant.tier}</Pill>
            </Td>
            <Td>
              <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{tenant.status}</Pill>
            </Td>
            <Td numeric>{tenant.mrr ? formatPeso(tenant.mrr) : "—"}</Td>
            <Td className="font-data text-xs text-console-muted">{tenant.renews}</Td>
            <Td className="text-xs text-console-muted">{LAST_BILLING_EVENT[tenant.status]}</Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
