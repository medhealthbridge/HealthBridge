import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { ToastButton } from "@/src/components/console/toast";
import { INVENTORY, STOCK_STATUS_TONE } from "@/src/lib/mock-data/clinix-admin";

export function InventoryTable() {
  return (
    <TableCard label="Inventory">
      <thead>
        <tr>
          <Th>Item</Th>
          <Th>SKU</Th>
          <Th numeric>On hand</Th>
          <Th numeric>Min</Th>
          <Th>Expiry</Th>
          <Th>Lot no.</Th>
          <Th>Status</Th>
          <Th className="w-24">
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {INVENTORY.map((item) => (
          <Tr key={item.sku}>
            <Td className="font-semibold">{item.item}</Td>
            <Td className="font-data text-[11px] text-console-subtle">{item.sku}</Td>
            <Td numeric>{item.qty}</Td>
            <Td numeric className="text-console-subtle">
              {item.min}
            </Td>
            <Td className="font-data text-xs text-console-muted">{item.expiry}</Td>
            <Td className="font-data text-[11px] text-console-subtle">{item.lot}</Td>
            <Td>
              <Pill tone={STOCK_STATUS_TONE[item.status]}>{item.status}</Pill>
            </Td>
            <Td>
              <RowActions>
                <ToastButton size="sm" message={`Restock request sent · ${item.item}`} aria-label={`Restock ${item.item}`}>
                  Restock
                </ToastButton>
              </RowActions>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
