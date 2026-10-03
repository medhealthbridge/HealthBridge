"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { rescheduleAppointmentAction, type RescheduleState } from "@/src/server/actions/appointments";
import type { PractitionerOption } from "@/src/server/services/clinic-app";

const INITIAL: RescheduleState = {};

export function RescheduleDialog({ appointmentId, patientName, date, time, practitionerStaffId, practitioners }: { appointmentId: string; patientName: string; date: string; time: string; practitionerStaffId: string | null; practitioners: PractitionerOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(rescheduleAppointmentAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.moved && handled.current !== state) {
      setOpen(false);
      toast("Appointment moved");
    }
    handled.current = state;
  }, [state, toast]);

  const errors = state.fieldErrors ?? {};
  const v = (key: string) => (state.values as Record<string, string> | undefined)?.[key];

  return (
    <>
      <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Reschedule ${patientName}`}>Reschedule</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={`Reschedule ${patientName}`} placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <DrawerHeader title={`Reschedule ${patientName}`} subtitle="The visit keeps its length." onClose={() => setOpen(false)} />
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <div className="grid grid-cols-2 gap-3">
            <FormField id={`rs-date-${appointmentId}`} label="Date" error={errors.date?.[0]}>
              <input id={`rs-date-${appointmentId}`} name="date" type="date" required defaultValue={v("date") ?? date} className={CONSOLE_INPUT} />
            </FormField>
            <FormField id={`rs-time-${appointmentId}`} label="Time" error={errors.time?.[0]}>
              <input id={`rs-time-${appointmentId}`} name="time" type="time" required step={300} defaultValue={v("time") ?? time} className={CONSOLE_INPUT} />
            </FormField>
          </div>
          <FormField id={`rs-pr-${appointmentId}`} label="Practitioner">
            <select id={`rs-pr-${appointmentId}`} name="practitionerStaffId" defaultValue={v("practitionerStaffId") ?? practitionerStaffId ?? ""} className={CONSOLE_INPUT}>
              <option value="">Anyone available</option>
              {practitioners.map((person) => <option key={person.staffId} value={person.staffId}>{person.name}</option>)}
            </select>
          </FormField>
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Moving…" : "Move"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
