"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { useToast } from "@/src/components/console/toast";
import { addPatientAction, type NewPatientState } from "@/src/server/actions/clinic-app";
import { FormField } from "./form-field";

const INITIAL: NewPatientState = {};

export function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addPatientAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  // Close and confirm once per successful save, not on every re-render.
  useEffect(() => {
    if (state.savedName && handled.current !== state) {
      setOpen(false);
      toast(`${state.savedName} added`);
    }
    handled.current = state;
  }, [state, toast]);

  const errors = state.fieldErrors ?? {};
  const value = (key: string) => state.values?.[key as keyof typeof state.values] ?? "";
  const invalid = (key: keyof typeof errors) => (errors[key] ? true : undefined);

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="size-4" /> Add patient
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Add patient" placement="right">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-console-line px-4 py-3">
            <h2 className="font-display text-base font-extrabold">Add patient</h2>
            <ConsoleButton size="sm" onClick={() => setOpen(false)}>Close</ConsoleButton>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="np-first" label="First name" error={errors.firstName?.[0]}>
                <input id="np-first" name="firstName" autoComplete="off" required defaultValue={value("firstName")} aria-invalid={invalid("firstName")} aria-describedby={errors.firstName ? "np-first-error" : undefined} className={CONSOLE_INPUT} />
              </FormField>
              <FormField id="np-last" label="Last name" error={errors.lastName?.[0]}>
                <input id="np-last" name="lastName" autoComplete="off" required defaultValue={value("lastName")} aria-invalid={invalid("lastName")} aria-describedby={errors.lastName ? "np-last-error" : undefined} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="np-sex" label="Sex" error={errors.sex?.[0]}>
                <select id="np-sex" name="sex" required defaultValue={value("sex")} aria-invalid={invalid("sex")} aria-describedby={errors.sex ? "np-sex-error" : undefined} className={CONSOLE_INPUT}>
                  <option value="" disabled>Choose</option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </FormField>
              <FormField id="np-dob" label="Birth date" error={errors.dateOfBirth?.[0]}>
                <input id="np-dob" name="dateOfBirth" type="date" defaultValue={value("dateOfBirth")} aria-invalid={invalid("dateOfBirth")} aria-describedby={errors.dateOfBirth ? "np-dob-error" : undefined} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <FormField id="np-phone" label="Mobile" error={errors.phone?.[0]} hint="e.g. 0917 555 4412">
              <input id="np-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" defaultValue={value("phone")} aria-invalid={invalid("phone")} aria-describedby={errors.phone ? "np-phone-error" : "np-phone-hint"} className={CONSOLE_INPUT} />
            </FormField>
            <FormField id="np-ph" label="PhilHealth PIN" error={errors.philhealth?.[0]} hint="12 digits, e.g. 12-345678901-2">
              <input id="np-ph" name="philhealth" inputMode="numeric" autoComplete="off" defaultValue={value("philhealth")} aria-invalid={invalid("philhealth")} aria-describedby={errors.philhealth ? "np-ph-error" : "np-ph-hint"} className={CONSOLE_INPUT} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="np-osca" label="Senior (OSCA) ID" error={errors.oscaId?.[0]}>
                <input id="np-osca" name="oscaId" autoComplete="off" defaultValue={value("oscaId")} className={CONSOLE_INPUT} />
              </FormField>
              <FormField id="np-pwd" label="PWD ID" error={errors.pwdId?.[0]}>
                <input id="np-pwd" name="pwdId" autoComplete="off" defaultValue={value("pwdId")} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
                <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" aria-invalid={invalid("consent")} />
                <span>The patient has read and agreed to the data privacy notice (RA 10173).</span>
              </label>
              {errors.consent && <p role="alert" className="text-[11px] text-console-danger">{errors.consent[0]}</p>}
            </div>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="border-t border-console-line px-4 py-3">
            <ConsoleButton type="submit" variant="primary" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Save patient"}
            </ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
