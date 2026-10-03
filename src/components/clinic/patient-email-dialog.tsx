"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { savePatientEmailAction } from "@/src/server/actions/reminders";

/** The address appointment reminders go to. Leave empty to stop reminders for this patient. */
export function PatientEmailDialog({ patientId, email }: { patientId: string; email: string | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(email ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  function save() {
    const data = new FormData();
    data.set("patientId", patientId);
    data.set("email", value);
    start(async () => {
      const result = await savePatientEmailAction(data);
      if (result.message) return setError(result.message);
      setOpen(false);
      setError("");
      toast(value.trim() ? "Reminder email saved" : "Reminder email removed");
    });
  }

  return (
    <>
      <ConsoleButton onClick={() => setOpen(true)}>{email ? "Reminder email" : "Add reminder email"}</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Reminder email" placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Reminder email</h2>
          <p className="text-[13px] text-console-muted">Appointment reminders go here the day before. Clear it to stop reminders for this patient.</p>
          <FormField id={`pt-email-${patientId}`} label="Email" error={error || undefined}>
            <input id={`pt-email-${patientId}`} type="email" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} className={CONSOLE_INPUT} />
          </FormField>
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton variant="primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
