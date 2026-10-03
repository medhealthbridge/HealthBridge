"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { useToast } from "@/src/components/console/toast";
import { setServiceArchivedAction } from "@/src/server/actions/services";

/** Archiving asks first; restoring doesn't (it can always be archived again). */
export function ArchiveServiceButton({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("id", id);
    data.set("archived", String(!archived));
    start(async () => {
      const result = await setServiceArchivedAction(data);
      if (result.message) return setError(result.message);
      setConfirming(false);
      toast(archived ? `${name} restored` : `${name} archived`);
    });
  }

  if (archived) {
    return (
      <ConsoleButton size="sm" disabled={pending} onClick={apply} aria-label={`Restore ${name}`} title={error || undefined}>
        Restore
      </ConsoleButton>
    );
  }

  return (
    <>
      <ConsoleButton size="sm" variant="danger" onClick={() => setConfirming(true)} aria-label={`Archive ${name}`}>Archive</ConsoleButton>
      <ConsoleDialog open={confirming} onClose={() => setConfirming(false)} label={`Archive ${name}`} placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Archive {name}?</h2>
          <p className="text-[13px] text-console-muted">It stops appearing for new bookings and checkouts. Past invoices still show it, and you can restore it from Archived.</p>
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
