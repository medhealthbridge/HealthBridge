"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { useToast } from "@/src/components/console/toast";
import { savePatientFieldsAction, type PatientFieldsState } from "@/src/server/actions/patient-fields";
import type { FieldDefinition } from "@/src/lib/patient-fields";
import { FieldInput } from "./field-input";

const INITIAL: PatientFieldsState = {};

/** Fills in the clinic's own fields for one patient. Only the fields this person may see are in the form. */
export function PatientFieldsDialog({ patientId, fields, values }: { patientId: string; fields: FieldDefinition[]; values: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(savePatientFieldsAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast("Details saved");
    }
    handled.current = state;
  }, [state, toast]);

  const sections = [...new Set(fields.map((field) => field.section))];

  return (
    <>
      <ConsoleButton size="sm" onClick={() => setOpen(true)}><Pencil aria-hidden="true" className="size-3.5" /> Edit</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Edit patient details">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="Patient details" subtitle="Fields your clinic set up." onClose={() => setOpen(false)} />
          <input type="hidden" name="patientId" value={patientId} />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {sections.map((section) => (
              <fieldset key={section} className="flex flex-col gap-3">
                <legend className="mb-1 text-xs font-bold tracking-wide text-console-subtle uppercase">{section}</legend>
                {fields.filter((field) => field.section === section).map((field) => (
                  <div key={field.key} className="flex flex-col gap-1">
                    <label htmlFor={`cf-${field.key}`} className="text-xs font-semibold">
                      {field.label}{field.required && <span className="text-console-danger"> *</span>}
                      {field.medical && <span className="ml-1.5 font-normal text-console-muted">· medical</span>}
                    </label>
                    <FieldInput field={field} value={values[field.key]} />
                  </div>
                ))}
              </fieldset>
            ))}
            {state.errors && (
              <ul role="alert" className="list-disc pl-5 text-xs text-console-danger">
                {state.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
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
