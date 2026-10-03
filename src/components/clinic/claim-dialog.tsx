"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { saveClaimAction, type ClaimFormState } from "@/src/server/actions/claims";
import type { ClaimRow } from "@/src/server/services/claims";

const INITIAL: ClaimFormState = {};

export function ClaimDialog({ claim, patients }: { claim?: ClaimRow; patients: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveClaimAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast(claim ? "Claim updated" : `Claim filed with ${state.saved}`);
    }
    handled.current = state;
  }, [state, toast, claim]);

  const errors = state.fieldErrors ?? {};
  const value = (key: keyof NonNullable<ClaimFormState["values"]>, fallback: string) => state.values?.[key] ?? fallback;
  const title = claim ? `Edit claim · ${claim.payorName}` : "File a claim";

  return (
    <>
      {claim ? (
        <ConsoleButton size="sm" onClick={() => setOpen(true)} aria-label={`Edit claim for ${claim.patientName}`}><Pencil aria-hidden="true" className="size-3.5" /> Edit</ConsoleButton>
      ) : (
        <ConsoleButton variant="primary" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-4" /> File a claim</ConsoleButton>
      )}
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label={title}>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title={title} subtitle="PhilHealth or HMO claim for a patient's visit." onClose={() => setOpen(false)} />
          {claim && <input type="hidden" name="id" value={claim.id} />}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="clm-patient" label="Patient" error={errors.patientId?.[0]}>
              <select id="clm-patient" name="patientId" required defaultValue={value("patientId", claim?.patientId ?? "")} className={CONSOLE_INPUT}>
                <option value="" disabled>Choose a patient</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.label}</option>)}
              </select>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="clm-type" label="Payor type" error={errors.payorType?.[0]}>
                <select id="clm-type" name="payorType" required defaultValue={value("payorType", claim?.payorType ?? "hmo")} className={CONSOLE_INPUT}>
                  <option value="hmo">HMO</option>
                  <option value="philhealth">PhilHealth</option>
                </select>
              </FormField>
              <FormField id="clm-payor" label="Payor" error={errors.payorName?.[0]} hint="e.g. Maxicare">
                <input id="clm-payor" name="payorName" required maxLength={80} defaultValue={value("payorName", claim?.payorName ?? "")} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="clm-member" label="Member / policy no." hint="Optional" error={errors.memberOrPolicyNumber?.[0]}>
                <input id="clm-member" name="memberOrPolicyNumber" maxLength={40} defaultValue={value("memberOrPolicyNumber", claim?.memberOrPolicyNumber ?? "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
              <FormField id="clm-loa" label="LOA number" hint="Optional" error={errors.loaNumber?.[0]}>
                <input id="clm-loa" name="loaNumber" maxLength={40} defaultValue={value("loaNumber", claim?.loaNumber ?? "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="clm-amount" label="Claim amount (₱)" error={errors.claimAmountCents?.[0]}>
                <input id="clm-amount" name="claimAmountCents" inputMode="decimal" required defaultValue={value("claimAmountCents", claim ? String(claim.claimAmountCents / 100) : "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
              <FormField id="clm-receipt" label="Receipt no." hint="Optional, e.g. OR-000012" error={errors.receiptNumber?.[0]}>
                <input id="clm-receipt" name="receiptNumber" maxLength={20} defaultValue={value("receiptNumber", claim?.receiptNumber ?? "")} className={`${CONSOLE_INPUT} font-data`} />
              </FormField>
            </div>
            <FormField id="clm-notes" label="Notes" hint="Optional" error={errors.notes?.[0]}>
              <textarea id="clm-notes" name="notes" rows={3} maxLength={500} defaultValue={value("notes", claim?.notes ?? "")} className={CONSOLE_INPUT} />
            </FormField>
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
