"use client";

import { useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { Kicker, Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { useToast } from "@/src/components/console/toast";
import type { PendingRequest } from "@/src/lib/mock-data/clinix-admin";

export function PendingConfirmations({ requests: initial }: { requests: PendingRequest[] }) {
  const toast = useToast();
  const [requests, setRequests] = useState(initial);

  if (requests.length === 0) return null;

  function confirm(request: PendingRequest) {
    setRequests((current) => current.filter((r) => r.id !== request.id));
    toast(`Confirmed · SMS sent to ${request.patient}`);
  }

  return (
    <Panel className="flex flex-col gap-2.5 border-console-info/45 p-3.5">
      <div className="flex items-center justify-between">
        <Kicker className="text-console-info">Pending confirmation</Kicker>
        <Pill tone="info">{requests.length}</Pill>
      </div>
      <ul className="flex flex-col gap-2.5">
        {requests.map((request) => (
          <li key={request.id} className="flex items-center gap-2.5 border-t border-console-line pt-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{request.patient}</p>
              <p className="text-[11px] text-console-subtle">
                {request.service} · {request.when}
              </p>
            </div>
            <ConsoleButton variant="primary" size="sm" onClick={() => confirm(request)} aria-label={`Confirm ${request.patient}`}>
              Confirm
            </ConsoleButton>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
