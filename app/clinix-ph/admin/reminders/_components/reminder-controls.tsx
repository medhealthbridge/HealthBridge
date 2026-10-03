"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { useToast } from "@/src/components/console/toast";
import { sendReminderNowAction, setRemindersEnabledAction } from "@/src/server/actions/reminders";

export function RemindersToggle({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <ConsoleButton
      variant={enabled ? "secondary" : "primary"}
      disabled={pending}
      onClick={() => {
        const data = new FormData();
        data.set("enabled", String(!enabled));
        start(async () => {
          await setRemindersEnabledAction(data);
          toast(enabled ? "Daily reminders turned off" : "Daily reminders turned on");
        });
      }}
    >
      {enabled ? "Turn off daily reminders" : "Turn on daily reminders"}
    </ConsoleButton>
  );
}

export function SendNowButton({ appointmentId, retry }: { appointmentId: string; retry: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  return (
    <div className="flex flex-col items-end gap-1">
      <ConsoleButton
        size="sm"
        disabled={pending}
        onClick={() => {
          const data = new FormData();
          data.set("appointmentId", appointmentId);
          start(async () => {
            const result = await sendReminderNowAction(data);
            if (result.message) return setError(result.message);
            setError("");
            toast("Reminder sent");
          });
        }}
      >
        {pending ? "Sending…" : retry ? "Retry" : "Send now"}
      </ConsoleButton>
      {error && <p role="alert" className="max-w-48 text-right text-[11px] text-console-danger">{error}</p>}
    </div>
  );
}
