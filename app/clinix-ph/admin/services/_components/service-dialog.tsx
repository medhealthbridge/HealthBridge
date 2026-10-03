"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveServiceAction, type ServiceFormState } from "@/src/server/actions/services";
import type { ServiceRow } from "@/src/server/services/price-list";

const INITIAL: ServiceFormState = {};

/** Add a service, or edit the one passed in. */
export function ServiceDialog({ service }: { service?: ServiceRow }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveServiceAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(service ? `${state.saved} updated` : `${state.saved} added`);
    }
    handled.current = state;
  }, [state, toast, service]);

  const errors = state.fieldErrors ?? {};
  // After a failed submit the form refills from what was typed; otherwise from the service being edited.
  const value = (key: keyof NonNullable<ServiceFormState["values"]>, fallback: string) => state.values?.[key] ?? fallback;
  const field = (key: keyof typeof errors) => ({ "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `svc-${key}-error` : undefined });
  const title = service ? `Edit ${service.name}` : "Add service";

  return (
    <>
      {service ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${service.name}`}>
          <Pencil aria-hidden="true" className="size-3.5" /> Edit
        </ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" className="size-4" /> Add service
        </ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle="Changes apply to new bookings and checkouts right away." onClose={() => setOpen(false)} />
          {service && <input type="hidden" name="id" value={service.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="svc-name" label="Service name" error={errors.name?.[0]}>
              <input id="svc-name" name="name" required maxLength={120} defaultValue={value("name", service?.name ?? "")} className={CONSOLE_INPUT} {...field("name")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="svc-price" label="Price (₱)" error={errors.priceCentavos?.[0]}>
                <input id="svc-price" name="priceCentavos" inputMode="decimal" required defaultValue={value("priceCentavos", service ? String(service.priceCentavos / 100) : "")} className={`${CONSOLE_INPUT} font-data`} {...field("priceCentavos")} />
              </FormField>
              <FormField id="svc-duration" label="Duration (minutes)" error={errors.durationMinutes?.[0]} hint="Optional">
                <input id="svc-duration" name="durationMinutes" inputMode="numeric" defaultValue={value("durationMinutes", service?.durationMinutes ? String(service.durationMinutes) : "")} className={CONSOLE_INPUT} {...field("durationMinutes")} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="svc-category" label="Category" error={errors.category?.[0]} hint="e.g. Preventive, Surgery">
                <input id="svc-category" name="category" maxLength={40} defaultValue={value("category", service?.category ?? "")} className={CONSOLE_INPUT} />
              </FormField>
              <FormField id="svc-code" label="Code" error={errors.code?.[0]} hint="Optional, for receipts">
                <input id="svc-code" name="code" maxLength={20} defaultValue={value("code", service?.code ?? "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
            </div>
            <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
              <input type="checkbox" name="vatExempt" defaultChecked={state.values ? state.values.vatExempt === "on" : service?.vatExempt} className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
              <span>VAT-exempt (e.g. medical consultations). Leave unticked for VATable services.</span>
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
