"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { recordPaymentAction, type PaymentState } from "@/src/server/actions/billing";
import { PAYMENT_LABELS, PAYMENT_METHODS } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";

const INITIAL: PaymentState = {};

/** Takes another payment on an open receipt. Cannot take more than the balance (the server checks too). */
export function RecordPaymentDialog({ invoiceId, balanceCents, number }: { invoiceId: string; balanceCents: number; number: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(recordPaymentAction, INITIAL);
  const [method, setMethod] = useState("cash");
  // One id per opened dialog, so a double tap records one payment, not two.
  const [requestId, setRequestId] = useState("");
  const toast = useToast();
  const router = useRouter();
  const handled = useRef(state);
  useEffect(() => {
    if (state.recorded && handled.current !== state) {
      setOpen(false);
      toast(`Payment ${state.recorded} recorded`);
      router.refresh();
    }
    handled.current = state;
  }, [state, toast, router]);
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => { setRequestId(crypto.randomUUID()); setOpen(true); }}>Record payment</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Record payment" placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Payment on {number}</h2>
          <p className="text-[13px] text-console-muted">Balance: <strong className="text-console-ink">{formatPesoExact(balanceCents / 100)}</strong></p>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="requestId" value={requestId} />
          <FormField id="rp-amount" label="Amount (₱)" error={errors.amount?.[0]}>
            <div className="flex gap-2">
              <input id="rp-amount" name="amount" inputMode="decimal" required defaultValue={String(balanceCents / 100)} className={`${CONSOLE_INPUT} font-data`} />
            </div>
          </FormField>
          <FormField id="rp-method" label="Paid by" error={errors.method?.[0]}>
            <select id="rp-method" name="method" value={method} onChange={(event) => setMethod(event.target.value)} className={CONSOLE_INPUT}>
              {PAYMENT_METHODS.map((key) => <option key={key} value={key}>{PAYMENT_LABELS[key]}</option>)}
            </select>
          </FormField>
          {method !== "cash" && (
            <FormField id="rp-ref" label="Reference number" error={errors.referenceNumber?.[0]}>
              <input id="rp-ref" name="referenceNumber" autoComplete="off" maxLength={60} className={CONSOLE_INPUT} />
            </FormField>
          )}
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Record payment"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
