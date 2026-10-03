"use client";

import { useState, useTransition } from "react";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { useToast } from "@/src/components/console/toast";
import { setClaimStatusAction } from "@/src/server/actions/claims";
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS, type ClaimStatus } from "@/src/lib/schemas/claim";

/** Moves a claim along its lifecycle. "Withdrawn" is the delete and is the owner's call. */
export function ClaimStatusSelect({ id, status, canWithdraw }: { id: string; status: ClaimStatus; canWithdraw: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  const closed = status === "paid" || status === "withdrawn";
  const options = CLAIM_STATUSES.filter((option) => canWithdraw || option !== "withdrawn");

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Claim status" disabled={pending || closed} value={status} className={`${CONSOLE_INPUT} h-8 py-0 text-xs`}
        onChange={(event) => {
          const data = new FormData();
          data.set("id", id);
          data.set("status", event.target.value);
          start(async () => {
            const result = await setClaimStatusAction(data);
            if (result.message) return setError(result.message);
            setError("");
            toast(`Marked ${CLAIM_STATUS_LABELS[event.target.value as ClaimStatus].toLowerCase()}`);
          });
        }}
      >
        {options.map((option) => <option key={option} value={option}>{CLAIM_STATUS_LABELS[option]}</option>)}
        {!options.includes(status) && <option value={status}>{CLAIM_STATUS_LABELS[status]}</option>}
      </select>
      {error && <p role="alert" className="text-[11px] text-console-danger">{error}</p>}
    </div>
  );
}
