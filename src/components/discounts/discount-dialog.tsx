"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveDiscountTypeAction, type DiscountFormState } from "@/src/server/actions/billing";
import type { DiscountTypeRow } from "@/src/server/services/discount-types";

const INITIAL: DiscountFormState = {};

export function DiscountDialog({ discount }: { discount?: DiscountTypeRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveDiscountTypeAction, INITIAL);
  const [kind, setKind] = useState<"percent" | "fixed">(discount?.kind ?? "percent");
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(discount ? `${state.saved} updated` : `${state.saved} added`);
    }
    handled.current = state;
  }, [state, toast, discount]);
  const errors = state.fieldErrors ?? {};
  const title = discount ? `Edit ${discount.name}` : "Add discount";
  const initialValue = discount ? String(discount.kind === "percent" ? discount.value : discount.value / 100) : "";

  return (
    <>
      {discount ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${discount.name}`}><Pencil aria-hidden="true" className="size-3.5" /> Edit</ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-4" /> Add discount</ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle="Front desk can pick it at checkout. Its name prints on the receipt." onClose={() => setOpen(false)} />
          {discount && <input type="hidden" name="id" value={discount.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="dt-name" label="Name" error={errors.name?.[0]} hint="e.g. Employee discount">
              <input id="dt-name" name="name" required maxLength={60} defaultValue={state.values?.name ?? discount?.name ?? ""} className={CONSOLE_INPUT} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="dt-kind" label="Type" error={errors.kind?.[0]}>
                <select id="dt-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as "percent" | "fixed")} className={CONSOLE_INPUT}>
                  <option value="percent">Percent off</option>
                  <option value="fixed">Peso amount off</option>
                </select>
              </FormField>
              <FormField id="dt-value" label={kind === "percent" ? "Percent" : "Amount (₱)"} error={errors.value?.[0]}>
                <input id="dt-value" name="value" inputMode="decimal" required defaultValue={state.values?.value ?? initialValue} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
            </div>
            <FormField id="dt-desc" label="Notes" hint="Optional, for your staff" error={errors.description?.[0]}>
              <input id="dt-desc" name="description" maxLength={200} defaultValue={state.values?.description ?? discount?.description ?? ""} className={CONSOLE_INPUT} />
            </FormField>
            <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
              <input type="checkbox" name="requiresId" defaultChecked={discount?.requiresId} className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
              <span><strong>Needs an ID number</strong> (staff must record one, like a membership or card number).</span>
            </label>
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
