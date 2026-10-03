"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { useToast } from "@/src/components/console/toast";
import { cancelAppointmentAction } from "@/src/server/actions/appointments";

export function CancelAppointmentButton({ appointmentId, patientName }: { appointmentId: string; patientName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("appointmentId", appointmentId);
    start(async () => {
      const result = await cancelAppointmentAction(data);
      if (result.message) return setError(result.message);
      setConfirming(false);
      toast("Appointment cancelled");
    });
  }

  return (
    <>
      <ConsoleButton size="sm" variant="danger" onClick={() => setConfirming(true)} aria-label={`Cancel ${patientName}'s appointment`}>Cancel</ConsoleButton>
      <ConsoleDialog open={confirming} onClose={() => setConfirming(false)} label="Cancel appointment" placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Cancel {patientName}&rsquo;s appointment?</h2>
          <p className="text-[13px] text-console-muted">The slot is freed. The appointment stays in their history as cancelled.</p>
          {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setConfirming(false)}>Keep it</ConsoleButton>
            <ConsoleButton variant="danger" disabled={pending} onClick={apply}>{pending ? "Cancelling…" : "Cancel appointment"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
