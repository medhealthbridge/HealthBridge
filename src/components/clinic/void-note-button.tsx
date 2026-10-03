"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { voidNoteAction } from "@/src/server/actions/clinical-notes";

/** Voiding hides a note from normal reading but keeps it, with who voided it and why. */
export function VoidNoteButton({ noteId }: { noteId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("noteId", noteId);
    data.set("reason", reason);
    start(async () => {
      const result = await voidNoteAction(data);
      if (result.message) return setError(result.message);
      setOpen(false);
      toast("Note voided");
    });
  }

  return (
    <>
      <ConsoleButton size="sm" variant="danger" onClick={() => setOpen(true)}>Void</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Void note" placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Void this note?</h2>
          <p className="text-[13px] text-console-muted">It is hidden from normal reading but kept in the record with your reason. This can&rsquo;t be undone.</p>
          <FormField id={`void-${noteId}`} label="Reason" error={error || undefined}>
            <input id={`void-${noteId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} className={CONSOLE_INPUT} />
          </FormField>
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton variant="danger" disabled={pending || reason.trim().length < 5} onClick={apply}>{pending ? "Voiding…" : "Void note"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
