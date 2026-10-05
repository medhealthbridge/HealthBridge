"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { addRecallAction, closeRecallAction, sendRecallReminderAction, type DentalState } from "@/src/server/actions/dental";

const INITIAL: DentalState = {};

/** Send the reminder email, mark done once they've been seen, or dismiss. Each is optional. */
export function RecallActions({ id, canEmail }: { id: string; canEmail: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  const run = (action: (data: FormData) => Promise<{ message?: string }>, fields: Record<string, string>, done: string) =>
    start(async () => {
      const data = new FormData();
      data.set("id", id);
      for (const [key, value] of Object.entries(fields)) data.set(key, value);
      const result = await action(data);
      setError(result.message ?? "");
      if (!result.message) toast(done);
    });
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {canEmail && <ConsoleButton size="sm" disabled={pending} onClick={() => run(sendRecallReminderAction, {}, "Reminder sent")}>Send reminder</ConsoleButton>}
      <ConsoleButton size="sm" variant="primary" disabled={pending} onClick={() => run(closeRecallAction, { outcome: "completed" }, "Marked done")}>Done</ConsoleButton>
      <ConsoleButton size="sm" disabled={pending} onClick={() => run(closeRecallAction, { outcome: "cancelled" }, "Dismissed")}>Dismiss</ConsoleButton>
      {error && <p role="alert" className="w-full text-right text-[11px] text-console-danger">{error}</p>}
    </div>
  );
}

export function RecallDialog({ patients }: { patients: { id: string; name: string; mrn: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addRecallAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  const errors = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast("Recall added");
    }
    handled.current = state;
  }, [state, toast]);

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}><CalendarPlus aria-hidden="true" className="size-4" /> Add recall</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Add recall">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="Add recall" subtitle="Remind the clinic to get in touch. Nothing is booked or sent automatically." onClose={() => setOpen(false)} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="recall-patient" label="Patient" error={errors.patientId?.[0]}>
              <select id="recall-patient" name="patientId" defaultValue="" className={CONSOLE_INPUT}>
                <option value="">Choose…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.mrn}</option>)}
              </select>
            </FormField>
            <FormField id="recall-months" label="Due in" error={errors.months?.[0]}>
              <select id="recall-months" name="months" defaultValue="6" className={CONSOLE_INPUT}>
                {[1, 3, 6, 12, 24].map((n) => <option key={n} value={n}>{n} month{n > 1 ? "s" : ""}</option>)}
              </select>
            </FormField>
            <FormField id="recall-reason" label="Reason (optional)" error={errors.reason?.[0]}>
              <input id="recall-reason" name="reason" maxLength={80} placeholder="Cleaning and check-up" className={CONSOLE_INPUT} />
            </FormField>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Add recall"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
