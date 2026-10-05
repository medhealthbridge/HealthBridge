import { ArchiveButton } from "@/src/components/console/archive-button";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { setDiscountArchivedAction } from "@/src/server/actions/billing";
import { describeDiscount } from "@/src/lib/discounts";
import type { DiscountTypeRow } from "@/src/server/services/discount-types";
import { DiscountDialog } from "./discount-dialog";

const BUILT_IN = [
  { name: "Senior citizen", rule: "20% off, sale is VAT-exempt first", law: "RA 9994 / RA 10754", needs: "OSCA ID number" },
  { name: "PWD", rule: "20% off, sale is VAT-exempt first", law: "RA 7277 as amended by RA 10754", needs: "PWD ID number" },
];

/** Built-in statutory discounts (fixed by law), then the clinic's own. Retiring one keeps every past receipt that used it. */
export function DiscountsManager({ rows }: { rows: DiscountTypeRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Built-in discounts">
          <span className="text-[11px] text-console-muted">Set by law. Always available at checkout.</span>
        </PanelHeader>
        <ul className="grid gap-x-6 px-3.5 py-2 sm:grid-cols-2">
          {BUILT_IN.map((item) => (
            <li key={item.name} className="border-b border-console-line py-2 text-[13px] last:border-0">
              <span className="font-semibold">{item.name}</span>
              <span className="block text-[11px] text-console-muted">{item.rule} · {item.law} · needs {item.needs}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold">Your clinic&rsquo;s discounts</h2>
          <p className="text-[13px] text-console-muted">Promos, staff and partner discounts. Front desk picks from this list; only you can write a one-off discount at checkout.</p>
        </div>
        <DiscountDialog />
      </div>
      {rows.length === 0 ? (
        <Panel className="px-4 py-6 text-center text-[13px] text-console-muted">No clinic discounts yet.</Panel>
      ) : (
        <TableCard label="Clinic discounts">
          <thead><tr><Th>Name</Th><Th>Discount</Th><Th>Notes</Th><Th>ID</Th><Th className="w-44"><span className="sr-only">Actions</span></Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-semibold">{row.name}</Td>
                <Td>{describeDiscount(row.kind, row.value)}</Td>
                <Td className="text-console-muted">{row.description ?? "—"}</Td>
                <Td>{row.requiresId ? <Pill tone="info">Needs ID</Pill> : <span className="text-console-subtle">—</span>}</Td>
                <Td>
                  <RowActions>
                    <div className="flex gap-1.5">
                      <DiscountDialog discount={row} />
                      <ArchiveButton id={row.id} name={row.name} noun="discount" action={setDiscountArchivedAction} archived={false} consequence="It stops appearing at checkout. Receipts that already used it keep it." />
                    </div>
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}
