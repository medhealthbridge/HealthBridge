"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { inviteStaffAction, type InviteStaffState } from "@/src/server/actions/clinic-staff";

const INITIAL: InviteStaffState = {};

export function InviteStaffDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteStaffAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.sentTo && handled.current !== state) {
      setOpen(false);
      toast(state.emailed ? `Invitation sent to ${state.sentTo}` : `Invite saved but the email failed — use Resend for ${state.sentTo}`);
    }
    handled.current = state;
  }, [state, toast]);

  const errors = state.fieldErrors ?? {};

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>+ Invite staff</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Invite staff" placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <DrawerHeader title="Invite staff" subtitle="They get an email with a link, valid for 7 days, to set up their access." onClose={() => setOpen(false)} />
          <FormField id="staff-email" label="Email" error={errors.email?.[0]}>
            <input id="staff-email" name="email" type="email" required autoComplete="off" defaultValue={state.values?.email ?? ""} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "staff-email-error" : undefined} className={CONSOLE_INPUT} />
          </FormField>
          <FormField id="staff-role" label="Role" error={errors.role?.[0]} hint="Assistants run the front desk; practitioners see their own patients and schedule.">
            <select id="staff-role" name="role" defaultValue={state.values?.role || "assistant"} className={CONSOLE_INPUT}>
              <option value="assistant">Front-desk assistant</option>
              <option value="practitioner">Practitioner</option>
            </select>
          </FormField>
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Sending…" : "Send invitation"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
