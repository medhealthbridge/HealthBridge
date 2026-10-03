"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { checkoutAction, type CheckoutState } from "@/src/server/actions/billing";
import { invoiceTotals, type DiscountType } from "@/src/lib/invoice-totals";
import { DISCOUNT_LABELS, PAYMENT_LABELS, PAYMENT_METHODS } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";

const INITIAL: CheckoutState = {};

export type CheckoutService = { id: string; name: string; priceCentavos: number; vatExempt: boolean };

/** Takes payment at the counter. The total shown here is a preview; the server recomputes it from the price list. */
export function CheckoutDialog({
  patients,
  services,
  defaultPatientId,
  receiptsPath,
}: {
  patients: { id: string; label: string }[];
  services: CheckoutService[];
  defaultPatientId?: string;
  receiptsPath: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(checkoutAction, INITIAL);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState<DiscountType>("none");
  const [method, setMethod] = useState<string>("cash");
  const toast = useToast();
  const router = useRouter();
  const handled = useRef(state);

  useEffect(() => {
    if (state.invoiceNumber && handled.current !== state) {
      setOpen(false);
      setQty({});
      toast(`Receipt ${state.invoiceNumber} issued`);
      router.push(`${receiptsPath}/${state.invoiceNumber}`);
    }
    handled.current = state;
  }, [state, toast, router, receiptsPath]);

  const chosen = services.filter((service) => (qty[service.id] ?? 0) > 0);
  const totals = useMemo(
    () => invoiceTotals(chosen.map((s) => ({ unitPriceCents: s.priceCentavos, quantity: qty[s.id], vatExempt: s.vatExempt })), discount),
    [chosen, qty, discount],
  );
  const errors = state.fieldErrors ?? {};
  const needsRef = method !== "cash";

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        <Receipt aria-hidden="true" className="size-4" /> New checkout
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="New checkout" placement="right">
        <form action={action} className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">New checkout</h2>
          <input type="hidden" name="lines" value={JSON.stringify(chosen.map((s) => ({ serviceId: s.id, quantity: qty[s.id] })))} />
          <FormField id="co-patient" label="Patient" error={errors.patientId?.[0]}>
            <select id="co-patient" name="patientId" required defaultValue={state.values?.patientId ?? defaultPatientId ?? ""} className={CONSOLE_INPUT}>
              <option value="" disabled>Choose a patient</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.label}</option>)}
            </select>
          </FormField>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-xs font-semibold">Services</legend>
            {services.length === 0 && <p className="text-[13px] text-console-muted">The price list is empty. Add services first.</p>}
            {services.map((service) => (
              <label key={service.id} className="flex items-center justify-between gap-3 rounded-lg border border-console-line px-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{service.name}</span>
                  <span className="text-console-muted">{formatPesoExact(service.priceCentavos / 100)}{service.vatExempt ? " · VAT-exempt" : ""}</span>
                </span>
                <input
                  type="number" min={0} max={99} inputMode="numeric" aria-label={`Quantity of ${service.name}`}
                  value={qty[service.id] ?? 0}
                  onChange={(event) => setQty((current) => ({ ...current, [service.id]: Math.max(0, Math.min(99, Number(event.target.value) || 0)) }))}
                  className={`${CONSOLE_INPUT} w-16 text-center`}
                />
              </label>
            ))}
            {errors.lines?.[0] && <p role="alert" className="text-xs text-console-danger">{errors.lines[0]}</p>}
          </fieldset>

          <FormField id="co-discount" label="Discount">
            <select id="co-discount" name="discountType" value={discount} onChange={(event) => setDiscount(event.target.value as DiscountType)} className={CONSOLE_INPUT}>
              {(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map((key) => <option key={key} value={key}>{DISCOUNT_LABELS[key]}</option>)}
            </select>
          </FormField>
          {discount !== "none" && (
            <FormField id="co-discount-id" label="Senior / PWD ID number" error={errors.discountIdNumber?.[0]}>
              <input id="co-discount-id" name="discountIdNumber" autoComplete="off" maxLength={40} defaultValue={state.values?.discountIdNumber ?? ""} className={CONSOLE_INPUT} />
            </FormField>
          )}

          <FormField id="co-method" label="Paid by" error={errors.method?.[0]}>
            <select id="co-method" name="method" value={method} onChange={(event) => setMethod(event.target.value)} className={CONSOLE_INPUT}>
              {PAYMENT_METHODS.map((key) => <option key={key} value={key}>{PAYMENT_LABELS[key]}</option>)}
            </select>
          </FormField>
          {needsRef && (
            <FormField id="co-ref" label="Reference number" error={errors.referenceNumber?.[0]}>
              <input id="co-ref" name="referenceNumber" autoComplete="off" maxLength={60} defaultValue={state.values?.referenceNumber ?? ""} className={CONSOLE_INPUT} />
            </FormField>
          )}

          <dl className="rounded-lg bg-console-hover/60 p-3 text-[13px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPesoExact(totals.subtotalCents / 100)}</dd></div>
            {totals.vatExemptCents > 0 && <div className="flex justify-between"><dt>Less VAT (exempt sale)</dt><dd>−{formatPesoExact(totals.vatExemptCents / 100)}</dd></div>}
            {totals.discountCents > 0 && <div className="flex justify-between"><dt>Discount 20%</dt><dd>−{formatPesoExact(totals.discountCents / 100)}</dd></div>}
            <div className="mt-1 flex justify-between border-t border-console-line pt-1 text-sm font-extrabold"><dt>Total due</dt><dd>{formatPesoExact(totals.totalCents / 100)}</dd></div>
          </dl>

          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending || chosen.length === 0}>{pending ? "Saving…" : "Take payment"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
