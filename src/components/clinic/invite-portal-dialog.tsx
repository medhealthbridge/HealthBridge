"use client";

import { useActionState, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { invitePatientAction, type InvitePatientState } from "@/src/server/actions/patient-portal";

const INITIAL: InvitePatientState = {};

/** Sends the patient a link to a read-only page of their own visits and receipts. */
export function InvitePortalDialog({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(invitePatientAction, INITIAL);
  const errors = state.fieldErrors ?? {};

  return (
    <>
      <ConsoleButton onClick={() => setOpen(true)}>Invite to portal</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Invite to portal" placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Invite {patientName}</h2>
          <p className="text-[13px] text-console-muted">They get a link to see their own appointments and receipts. It&rsquo;s view-only; they can&rsquo;t change anything.</p>
          <input type="hidden" name="patientId" value={patientId} />
          {state.sentTo ? (
            <p role="status" className="text-[13px]">{state.emailed ? `Invitation sent to ${state.sentTo}.` : `Saved, but the email to ${state.sentTo} could not be sent. Try again in a moment.`}</p>
          ) : (
            <FormField id={`portal-email-${patientId}`} label="Patient's email" error={errors.email?.[0]}>
              <input id={`portal-email-${patientId}`} name="email" type="email" required autoComplete="off" defaultValue={state.values?.email ?? ""} className={CONSOLE_INPUT} />
            </FormField>
          )}
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>{state.sentTo ? "Close" : "Cancel"}</ConsoleButton>
            {!state.sentTo && <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</ConsoleButton>}
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
