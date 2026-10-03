import Link from "next/link";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { ArchiveButton } from "@/src/components/console/archive-button";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { ItemDialog } from "@/src/components/clinic/item-dialog";
import { StockDialog } from "@/src/components/clinic/stock-dialog";
import { setItemArchivedAction } from "@/src/server/actions/inventory";
import type { InventoryRow, StockStatus } from "@/src/server/services/inventory";
import type { Tone } from "@/src/types/console";

const STATUS: Record<StockStatus, { label: string; tone: Tone }> = {
  ok: { label: "In stock", tone: "accent" },
  low: { label: "Low", tone: "warn" },
  out: { label: "Out", tone: "danger" },
  expiring: { label: "Expiring soon", tone: "warn" },
};

/** Everyone sees stock and records use; only the owner manages items and receives deliveries. */
export function InventoryPanel({ rows, basePath, canManage, archivedView }: { rows: InventoryRow[]; basePath: string; canManage: boolean; archivedView: boolean }) {
  const toggle = canManage ? (
    <div className="flex justify-end">
      <Link href={archivedView ? basePath : `${basePath}?view=archived`} className={consoleButtonClass("secondary", "sm")}>{archivedView ? "Back to active items" : "Show archived"}</Link>
    </div>
  ) : null;

  if (rows.length === 0) {
    return (
      <>
        {toggle}
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">
          {archivedView ? "No archived items." : canManage ? "No items yet. Add the supplies you track, then receive your first delivery." : "No items yet. The owner adds the supplies the clinic tracks."}
        </Panel>
      </>
    );
  }

  return (
    <>
      {toggle}
      <TableCard label={archivedView ? "Archived items" : "Inventory"}>
        <thead>
          <tr>
            <Th>Item</Th><Th numeric>In stock</Th><Th numeric>Reorder at</Th><Th>Next expiry</Th><Th>Status</Th>
            <Th className="w-56"><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <Tr key={item.id}>
              <Td className="font-semibold">
                {item.name}
                {item.sku && <span className="ml-1.5 font-data text-[11px] font-normal text-console-subtle">{item.sku}</span>}
              </Td>
              <Td numeric>{item.onHand} <span className="text-console-muted">{item.unit}</span></Td>
              <Td numeric className="text-console-muted">{item.reorderThreshold}</Td>
              <Td className="whitespace-nowrap text-console-muted">{item.nextExpiry ?? "—"}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Pill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Pill>
                  {item.expiredQty > 0 && <Pill tone="danger">{item.expiredQty} expired</Pill>}
                </div>
              </Td>
              <Td>
                <RowActions>
                  <div className="flex flex-wrap gap-1.5">
                    {!archivedView && <StockDialog item={item} mode="use" />}
                    {canManage && !archivedView && (
                      <>
                        <StockDialog item={item} mode="receive" />
                        <ItemDialog item={item} />
                      </>
                    )}
                    {canManage && <ArchiveButton id={item.id} name={item.name} noun="item" action={setItemArchivedAction} archived={archivedView} consequence="It leaves the shelf list and can't be used. Its stock history is kept." />}
                  </div>
                </RowActions>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>
    </>
  );
}
