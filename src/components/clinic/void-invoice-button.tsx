"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { voidInvoiceAction } from "@/src/server/actions/billing";

/** Owner only. The receipt number stays in the books, marked void with the reason. */
export function VoidInvoiceButton({ invoiceId, number }: { invoiceId: string; number: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("invoiceId", invoiceId);
    data.set("reason", reason);
    start(async () => {
      const result = await voidInvoiceAction(data);
      if (result.message) return setError(result.message);
      setOpen(false);
      toast(`${number} voided`);
    });
  }

  return (
    <>
      <ConsoleButton variant="danger" onClick={() => setOpen(true)}>Void receipt</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Void receipt" placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Void {number}?</h2>
          <p className="text-[13px] text-console-muted">The receipt number stays in your sales book, marked void with your reason. Refund the patient separately. This can&rsquo;t be undone.</p>
          <FormField id="void-invoice" label="Reason" error={error || undefined}>
            <input id="void-invoice" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} className={CONSOLE_INPUT} />
          </FormField>
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton variant="danger" disabled={pending || reason.trim().length < 5} onClick={apply}>{pending ? "Voiding…" : "Void receipt"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
