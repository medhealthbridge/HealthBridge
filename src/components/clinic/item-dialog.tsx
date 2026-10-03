"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveItemAction, type ItemFormState } from "@/src/server/actions/inventory";
import type { InventoryRow } from "@/src/server/services/inventory";

const INITIAL: ItemFormState = {};

export function ItemDialog({ item }: { item?: InventoryRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveItemAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(item ? `${state.saved} updated` : `${state.saved} added`);
    }
    handled.current = state;
  }, [state, toast, item]);

  const errors = state.fieldErrors ?? {};
  const value = (key: keyof NonNullable<ItemFormState["values"]>, fallback: string) => state.values?.[key] ?? fallback;
  const title = item ? `Edit ${item.name}` : "Add item";

  return (
    <>
      {item ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${item.name}`}><Pencil aria-hidden="true" className="size-3.5" /> Edit</ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-4" /> Add item</ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle="Stock counts come from the lots you receive." onClose={() => setOpen(false)} />
          {item && <input type="hidden" name="id" value={item.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="inv-name" label="Item name" error={errors.name?.[0]}>
              <input id="inv-name" name="name" required maxLength={120} defaultValue={value("name", item?.name ?? "")} className={CONSOLE_INPUT} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="inv-sku" label="SKU" error={errors.sku?.[0]} hint="Optional">
                <input id="inv-sku" name="sku" maxLength={40} defaultValue={value("sku", item?.sku ?? "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
              <FormField id="inv-unit" label="Unit" error={errors.unit?.[0]} hint="box, vial, piece…">
                <input id="inv-unit" name="unit" required maxLength={20} defaultValue={value("unit", item?.unit ?? "unit")} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <FormField id="inv-reorder" label="Reorder level" error={errors.reorderThreshold?.[0]} hint="Flag as low at or under this count">
              <input id="inv-reorder" name="reorderThreshold" inputMode="numeric" required defaultValue={value("reorderThreshold", String(item?.reorderThreshold ?? 0))} className={CONSOLE_INPUT} />
            </FormField>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
