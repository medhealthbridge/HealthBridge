"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { useToast } from "@/src/components/console/toast";
import { addWalkInAction, type WalkInState } from "@/src/server/actions/clinic-app";
import type { PractitionerOption } from "@/src/server/services/clinic-app";
import { FormField } from "./form-field";

const INITIAL: WalkInState = {};

export function AddWalkInDialog({
  patients,
  practitioners,
  patientsHref,
}: {
  patients: { id: string; label: string }[];
  practitioners: PractitionerOption[];
  patientsHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addWalkInAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.queueNumber && handled.current !== state) {
      setOpen(false);
      toast(`Queued as #${state.queueNumber}`);
    }
    handled.current = state;
  }, [state, toast]);

  const errors = state.fieldErrors ?? {};

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden="true" className="size-4" /> Add walk-in
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Add walk-in" placement="center">
        <form action={action} className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Add walk-in</h2>
          {patients.length === 0 ? (
            <p className="text-[13px] text-console-muted">
              No patients yet. <a href={patientsHref} className="font-semibold text-console-accent underline">Add the patient first</a>, then queue them here.
            </p>
          ) : (
            <>
              <FormField id="wi-patient" label="Patient" error={errors.patientId?.[0]}>
                <select id="wi-patient" name="patientId" required defaultValue={state.values?.patientId ?? ""} className={CONSOLE_INPUT}>
                  <option value="" disabled>Choose a patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="wi-practitioner" label="Practitioner" hint="Optional">
                <select id="wi-practitioner" name="practitionerStaffId" defaultValue="" className={CONSOLE_INPUT}>
                  <option value="">Anyone available</option>
                  {practitioners.map((practitioner) => (
                    <option key={practitioner.staffId} value={practitioner.staffId}>{practitioner.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="wi-room" label="Chair or room" hint="Optional">
                <input id="wi-room" name="chairOrRoom" autoComplete="off" maxLength={40} className={CONSOLE_INPUT} />
              </FormField>
            </>
          )}
          {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            {patients.length > 0 && (
              <ConsoleButton type="submit" variant="primary" disabled={pending}>
                {pending ? "Adding…" : "Add to queue"}
              </ConsoleButton>
            )}
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
