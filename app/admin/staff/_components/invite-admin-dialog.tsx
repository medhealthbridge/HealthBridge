"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { inviteAdminAction, type InviteAdminState } from "@/src/server/actions/platform-staff";

const INITIAL: InviteAdminState = {};

export function InviteAdminDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteAdminAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.sentTo && handled.current !== state) {
      setOpen(false);
      toast(state.emailed ? `Invitation sent to ${state.sentTo}` : `Invite saved but the email failed — resend to ${state.sentTo}`);
    }
    handled.current = state;
  }, [state, toast]);

  const error = state.fieldErrors?.email?.[0];

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        + Invite admin
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Invite admin" placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <DrawerHeader title="Invite admin" subtitle="They get an email with a link, valid for 7 days, to set up their access." onClose={() => setOpen(false)} />
          <FormField id="invite-email" label="Email" error={error}>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              defaultValue={state.values?.email ?? ""}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "invite-email-error" : undefined}
              className={CONSOLE_INPUT}
            />
          </FormField>
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>
              {pending ? "Sending…" : "Send invitation"}
            </ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
