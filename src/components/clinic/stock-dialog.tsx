"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { receiveStockAction, consumeStockAction, type StockFormState } from "@/src/server/actions/inventory";
import type { InventoryRow } from "@/src/server/services/inventory";

const INITIAL: StockFormState = {};

/** "receive" (owner: a delivery arrives as a lot) or "use" (any staff: stock taken off the shelf). */
export function StockDialog({ item, mode }: { item: InventoryRow; mode: "receive" | "use" }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(mode === "receive" ? receiveStockAction : consumeStockAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(`${item.name}: ${state.saved}`);
    }
    handled.current = state;
  }, [state, toast, item.name]);

  const errors = state.fieldErrors ?? {};
  const title = mode === "receive" ? `Receive ${item.name}` : `Use ${item.name}`;
  const id = `${mode}-${item.id}`;

  return (
    <>
      <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={title}>{mode === "receive" ? "Receive" : "Use"}</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title} placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">{title}</h2>
          <input type="hidden" name="itemId" value={item.id} />
          <FormField id={`${id}-qty`} label={`Quantity (${item.unit})`} error={errors.quantity?.[0]} hint={mode === "use" ? `${item.onHand} in date` : undefined}>
            <input id={`${id}-qty`} name="quantity" inputMode="numeric" required defaultValue={state.values?.quantity ?? ""} className={CONSOLE_INPUT} />
          </FormField>
          {mode === "receive" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id={`${id}-lot`} label="Lot number" hint="Optional" error={errors.lotNumber?.[0]}>
                <input id={`${id}-lot`} name="lotNumber" maxLength={40} defaultValue={state.values?.lotNumber ?? ""} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
              <FormField id={`${id}-exp`} label="Expiry date" hint="Optional" error={errors.expiresOn?.[0]}>
                <input id={`${id}-exp`} name="expiresOn" type="date" defaultValue={state.values?.expiresOn ?? ""} className={CONSOLE_INPUT} />
              </FormField>
            </div>
          ) : (
            <FormField id={`${id}-reason`} label="Note" hint="Optional, e.g. extraction" error={errors.reason?.[0]}>
              <input id={`${id}-reason`} name="reason" maxLength={120} defaultValue={state.values?.reason ?? ""} className={CONSOLE_INPUT} />
            </FormField>
          )}
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : mode === "receive" ? "Add to stock" : "Record use"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
