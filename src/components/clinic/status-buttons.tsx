"use client";

import { useState, useTransition } from "react";
import { consoleButtonClass, type ConsoleButtonVariant } from "@/src/components/console/console-button";
import { useToast } from "@/src/components/console/toast";
import { changeStatusAction } from "@/src/server/actions/clinic-app";
import type { AppointmentStatus } from "@/src/server/services/clinic-app";

type Step = { to: AppointmentStatus; label: string; variant: ConsoleButtonVariant };

// The buttons offered per state; the service enforces the same table, so this is only a convenience.
const STEPS: Partial<Record<AppointmentStatus, Step[]>> = {
  requested: [
    { to: "confirmed", label: "Confirm", variant: "primary" },
    { to: "cancelled", label: "Cancel", variant: "danger" },
  ],
  confirmed: [
    { to: "checked_in", label: "Check in", variant: "primary" },
    { to: "no_show", label: "No-show", variant: "secondary" },
  ],
  checked_in: [
    { to: "in_progress", label: "Start", variant: "primary" },
    { to: "cancelled", label: "Cancel", variant: "danger" },
  ],
  in_progress: [{ to: "completed", label: "Complete", variant: "primary" }],
};

export function StatusButtons({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  const steps = STEPS[status];
  if (!steps) return null;

  function move(to: AppointmentStatus) {
    const data = new FormData();
    data.set("appointmentId", appointmentId);
    data.set("to", to);
    start(async () => {
      const result = await changeStatusAction(data);
      setError(result.message ?? "");
      if (!result.message) toast("Updated");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {steps.map((step) => (
        <button key={step.to} type="button" disabled={pending} onClick={() => move(step.to)} className={consoleButtonClass(step.variant, "sm")}>
          {step.label}
        </button>
      ))}
      {error && <p role="alert" className="w-full text-right text-[11px] text-console-danger">{error}</p>}
    </div>
  );
}
