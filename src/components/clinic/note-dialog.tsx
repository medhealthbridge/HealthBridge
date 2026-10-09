"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FilePlus, Pencil } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveNoteAction, type NoteState } from "@/src/server/actions/clinical-notes";

const INITIAL: NoteState = {};
const AREA = "min-h-24 rounded-lg border border-console-line bg-console-canvas px-3 py-2 text-base text-console-ink placeholder:text-console-subtle focus-visible:border-console-accent focus-visible:outline-2 focus-visible:outline-console-accent/30 md:text-[13px]";

type Seed = { subjective: string; objective: string; assessment: string; plan: string };
type NoteDialogProps =
  | { mode: "new"; patientId: string; /** Prefill, e.g. a draft written from the tooth chart. */ seed?: Seed; /** Button text instead of "Add note". */ label?: string }
  | { mode: "edit"; noteId: string; seed: Seed }
  | { mode: "amend"; patientId: string; amendsNoteId: string; seed: Seed };

const TITLE = { new: "Add note", edit: "Edit note", amend: "Add amendment" } as const;
const SECTIONS = [
  ["subjective", "Subjective", "What the patient reports"],
  ["objective", "Objective", "Findings and measurements"],
  ["assessment", "Assessment", "Diagnosis or impression"],
  ["plan", "Plan", "Treatment and follow-up"],
] as const;

/** Write a visit note, edit one's own within 24 hours, or amend an older one. */
export function NoteDialog(props: NoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveNoteAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(props.mode === "edit" ? "Note updated" : "Note saved");
    }
    handled.current = state;
  }, [state, toast, props.mode]);

  const seed = props.seed;
  const buttonLabel = props.mode === "new" ? props.label : undefined;
  const errors = state.fieldErrors ?? {};
  const v = (key: string) => (state.values as Record<string, string> | undefined)?.[key];

  return (
    <>
      <ConsoleButton variant={props.mode === "new" ? "primary" : "secondary"} size={props.mode === "new" && !buttonLabel ? "md" : "sm"} onClick={() => setOpen(true)}>
        {props.mode === "new" ? <FilePlus aria-hidden="true" className="size-4" /> : props.mode === "edit" ? <Pencil aria-hidden="true" className="size-3.5" /> : null}
        {buttonLabel ?? TITLE[props.mode]}
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={TITLE[props.mode]}>
        {/* Keyed by the prefill so a fresh draft replaces the old one each time it changes. */}
        <form key={seed ? JSON.stringify(seed) : "blank"} action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader
            title={TITLE[props.mode]}
            subtitle={props.mode === "amend" ? "Adds a correction that points back at the original. The original stays as written." : props.mode === "edit" ? "You can edit your own note for 24 hours; after that, amend it." : "Everything is recorded in the audit log."}
            onClose={() => setOpen(false)}
          />
          {props.mode === "edit" ? <input type="hidden" name="noteId" value={props.noteId} /> : <input type="hidden" name="patientId" value={props.patientId} />}
          {props.mode === "amend" && <input type="hidden" name="amendsNoteId" value={props.amendsNoteId} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {SECTIONS.map(([key, label, hint]) => (
              <FormField key={key} id={`note-${key}`} label={label} hint={hint} error={errors[key]?.[0]}>
                <textarea id={`note-${key}`} name={key} maxLength={4000} defaultValue={v(key) ?? seed?.[key] ?? ""} className={AREA} aria-invalid={errors[key] ? true : undefined} aria-describedby={errors[key] ? `note-${key}-error` : undefined} />
              </FormField>
            ))}
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Save note"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
