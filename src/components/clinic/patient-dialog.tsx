"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { addPatientAction, updatePatientAction, type EditPatientState, type NewPatientState } from "@/src/server/actions/clinic-app";
import type { PatientRow } from "@/src/server/services/clinic-app";
import type { FieldDefinition } from "@/src/lib/patient-fields";
import { FieldInput } from "@/src/components/patient-fields/field-input";

const INITIAL: NewPatientState & EditPatientState = {};

type Patient = Pick<PatientRow, "id" | "name" | "firstName" | "lastName" | "sex" | "dateOfBirth" | "phone" | "philhealth" | "oscaId" | "pwdId">;

/** Add a patient (with the privacy consent), or edit the one passed in. */
export function PatientDialog({ patient, customFields = [] }: { patient?: Patient; /** The clinic's own fields this person may fill in; asked when adding. Edited later from the chart. */ customFields?: FieldDefinition[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(patient ? updatePatientAction : addPatientAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.savedName && handled.current !== state) {
      setOpen(false);
      toast(patient ? `${state.savedName} updated` : `${state.savedName} added`);
    }
    handled.current = state;
  }, [state, toast, patient]);

  const errors = state.fieldErrors ?? {};
  const customErrors = (state as NewPatientState).customErrors;
  // After a failed submit the form refills from what was typed; otherwise from the patient being edited.
  const value = (key: string, fallback: string | null | undefined) => (state.values as Record<string, string> | undefined)?.[key] ?? fallback ?? "";
  const field = (key: string) => ({ "aria-invalid": (errors as Record<string, string[]>)[key] ? (true as const) : undefined, "aria-describedby": (errors as Record<string, string[]>)[key] ? `pt-${key}-error` : undefined });
  const error = (key: string) => (errors as Record<string, string[] | undefined>)[key]?.[0];
  const title = patient ? `Edit ${patient.name}` : "Add patient";

  return (
    <>
      {patient ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${patient.name}`}>
          <Pencil aria-hidden="true" className="size-3.5" /> Edit
        </ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" className="size-4" /> Add patient
        </ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle={patient ? "Changes are recorded in the audit log." : "Fill in what you have; only the name and sex are required."} onClose={() => setOpen(false)} />
          {patient && <input type="hidden" name="id" value={patient.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField id="pt-firstName" label="First name" error={error("firstName")}>
                <input id="pt-firstName" name="firstName" autoComplete="off" required defaultValue={value("firstName", patient?.firstName)} className={CONSOLE_INPUT} {...field("firstName")} />
              </FormField>
              <FormField id="pt-lastName" label="Last name" error={error("lastName")}>
                <input id="pt-lastName" name="lastName" autoComplete="off" required defaultValue={value("lastName", patient?.lastName)} className={CONSOLE_INPUT} {...field("lastName")} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="pt-sex" label="Sex" error={error("sex")}>
                <select id="pt-sex" name="sex" required defaultValue={value("sex", patient?.sex)} className={CONSOLE_INPUT} {...field("sex")}>
                  <option value="" disabled>Choose</option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </FormField>
              <FormField id="pt-dateOfBirth" label="Birth date" error={error("dateOfBirth")}>
                <input id="pt-dateOfBirth" name="dateOfBirth" type="date" defaultValue={value("dateOfBirth", patient?.dateOfBirth)} className={CONSOLE_INPUT} {...field("dateOfBirth")} />
              </FormField>
            </div>
            <FormField id="pt-phone" label="Mobile" error={error("phone")} hint="e.g. 0917 555 4412">
              <input id="pt-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" defaultValue={value("phone", patient?.phone)} className={CONSOLE_INPUT} {...field("phone")} />
            </FormField>
            <FormField id="pt-philhealth" label="PhilHealth PIN" error={error("philhealth")} hint="12 digits, e.g. 12-345678901-2">
              <input id="pt-philhealth" name="philhealth" inputMode="numeric" autoComplete="off" defaultValue={value("philhealth", patient?.philhealth)} className={CONSOLE_INPUT} {...field("philhealth")} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="pt-oscaId" label="Senior (OSCA) ID" error={error("oscaId")}>
                <input id="pt-oscaId" name="oscaId" autoComplete="off" defaultValue={value("oscaId", patient?.oscaId)} className={CONSOLE_INPUT} />
              </FormField>
              <FormField id="pt-pwdId" label="PWD ID" error={error("pwdId")}>
                <input id="pt-pwdId" name="pwdId" autoComplete="off" defaultValue={value("pwdId", patient?.pwdId)} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            {!patient && customFields.length > 0 && (
              <>
                {[...new Set(customFields.map((item) => item.section))].map((section) => (
                  <fieldset key={section} className="flex flex-col gap-3 border-t border-console-line pt-3">
                    <legend className="text-xs font-bold tracking-wide text-console-subtle uppercase">{section}</legend>
                    {customFields.filter((item) => item.section === section).map((item) => (
                      <div key={item.key} className="flex flex-col gap-1">
                        <label htmlFor={`cf-${item.key}`} className="text-xs font-semibold">
                          {item.label}{item.required && <span className="text-console-danger"> *</span>}
                          {item.medical && <span className="ml-1.5 font-normal text-console-muted">· medical</span>}
                        </label>
                        <FieldInput field={item} value={null} />
                      </div>
                    ))}
                  </fieldset>
                ))}
                {customErrors && (
                  <ul role="alert" className="list-disc pl-5 text-xs text-console-danger">
                    {customErrors.map((message: string) => <li key={message}>{message}</li>)}
                  </ul>
                )}
              </>
            )}
            {!patient && (
              <div className="flex flex-col gap-1">
                <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
                  <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" aria-invalid={error("consent") ? true : undefined} />
                  <span>The patient has read and agreed to the data privacy notice (RA 10173).</span>
                </label>
                {error("consent") && <p role="alert" className="text-[11px] text-console-danger">{error("consent")}</p>}
              </div>
            )}
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
