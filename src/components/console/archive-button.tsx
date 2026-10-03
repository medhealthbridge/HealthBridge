"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "./console-button";
import { ConsoleDialog } from "./console-dialog";
import { useToast } from "./toast";

type ArchiveButtonProps = {
  /** Shown in the confirmation and toast, e.g. a patient or service name. */
  name: string;
  /** What kind of record, e.g. "patient"; used in the confirmation text. */
  noun: string;
  /** Server action taking `id` and `archived` ("true" to archive, "false" to restore). */
  action: (data: FormData) => Promise<{ message?: string }>;
  id: string;
  archived: boolean;
  /** What archiving does to the record, shown before the person confirms. */
  consequence: string;
};

/** Archiving asks first; restoring doesn't (it can always be archived again). Nothing is erased either way. */
export function ArchiveButton({ name, noun, action, id, archived, consequence }: ArchiveButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("id", id);
    data.set("archived", String(!archived));
    start(async () => {
      const result = await action(data);
      if (result.message) return setError(result.message);
      setConfirming(false);
      setError("");
      toast(archived ? `${name} restored` : `${name} archived`);
    });
  }

  if (archived) {
    return (
      <>
        <ConsoleButton size="sm" disabled={pending} onClick={apply} aria-label={`Restore ${name}`}>Restore</ConsoleButton>
        {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
      </>
    );
  }

  return (
    <>
      <ConsoleButton size="sm" variant="danger" onClick={() => setConfirming(true)} aria-label={`Archive ${name}`}>Archive</ConsoleButton>
      <ConsoleDialog open={confirming} onClose={() => setConfirming(false)} label={`Archive ${name}`} placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Archive {name}?</h2>
          <p className="text-[13px] text-console-muted">{consequence} You can restore this {noun} from Archived at any time.</p>
          {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setConfirming(false)}>Cancel</ConsoleButton>
            <ConsoleButton variant="danger" disabled={pending} onClick={apply}>{pending ? "Archiving…" : "Archive"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
