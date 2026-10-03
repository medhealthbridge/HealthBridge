"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveFieldAction, type FieldFormState } from "@/src/server/actions/patient-fields";
import { FIELD_TYPES, FIELD_TYPE_LABELS, type FieldDefinition, type FieldType } from "@/src/lib/patient-fields";

const INITIAL: FieldFormState = {};

/** Add or edit one patient field. `addon` changes only the wording: the server decides the scope from the role. */
export function FieldDialog({ field, addon = false, sections }: { field?: FieldDefinition; addon?: boolean; sections: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveFieldAction, INITIAL);
  const [type, setType] = useState<FieldType>(field?.type ?? "text");
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(field ? `${state.saved} updated` : `${state.saved} added`);
    }
    handled.current = state;
  }, [state, toast, field]);

  const errors = state.fieldErrors ?? {};
  const title = field ? `Edit ${field.label}` : addon ? "Add an add-on field" : "Add a field";
  const hasChoices = type === "select" || type === "multi_select";
  const listId = `sections-${field?.id ?? "new"}`;

  return (
    <>
      {field ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${field.label}`}><Pencil aria-hidden="true" className="size-3.5" /> Edit</ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-4" /> {addon ? "Add add-on" : "Add field"}</ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle={field ? "Renaming keeps every patient's answer." : "It appears on every patient's chart at this branch."} onClose={() => setOpen(false)} />
          {field && <input type="hidden" name="id" value={field.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="pf-label" label="Field name" error={errors.label?.[0]} hint="e.g. Blood type">
              <input id="pf-label" name="label" required maxLength={60} defaultValue={state.values?.label ?? field?.label ?? ""} className={CONSOLE_INPUT} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="pf-type" label="Type" error={errors.type?.[0]} hint={field ? "Changing it is refused if existing answers won't fit." : undefined}>
                <select id="pf-type" name="type" value={type} onChange={(event) => setType(event.target.value as FieldType)} className={CONSOLE_INPUT}>
                  {FIELD_TYPES.map((key) => <option key={key} value={key}>{FIELD_TYPE_LABELS[key]}</option>)}
                </select>
              </FormField>
              <FormField id="pf-section" label="Section" error={errors.section?.[0]} hint="Groups fields on the chart">
                <input id="pf-section" name="section" list={listId} maxLength={40} defaultValue={state.values?.section ?? field?.section ?? "Other details"} className={CONSOLE_INPUT} />
                <datalist id={listId}>{sections.map((section) => <option key={section} value={section} />)}</datalist>
              </FormField>
            </div>
            {hasChoices && (
              <FormField id="pf-options" label="Choices, one per line" error={errors.options?.[0]} hint={field ? "Removing a choice keeps it on patients who already have it." : undefined}>
                <textarea id="pf-options" name="options" rows={5} defaultValue={state.values?.options ?? field?.options.join("\n") ?? ""} className={CONSOLE_INPUT} />
              </FormField>
            )}
            <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
              <input type="checkbox" name="required" defaultChecked={field?.required} className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
              <span><strong>Required.</strong> Must be filled in when a patient&rsquo;s details are saved. Older records without it are flagged, not blocked.</span>
            </label>
            <label className="flex min-h-11 items-start gap-2.5 text-xs md:min-h-0">
              <input type="checkbox" name="medical" defaultChecked={field?.medical} className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
              <span><strong>Medical.</strong> Only the owner and practitioners see it. Hidden from the front desk and the patient portal.</span>
            </label>
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
