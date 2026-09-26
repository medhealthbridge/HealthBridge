"use client";

import { DetailDrawer } from "@/src/components/console/detail-drawer";
import { PATIENT_RECORD, patientDrawerActions, type Patient } from "@/src/lib/mock-data/clinix-admin";
import { formatPeso } from "@/src/lib/utils";
import { useActiveBranch } from "../../_components/branch-context";

export function PatientDrawer({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const { branch } = useActiveBranch();
  if (!patient) return null;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={patient.name}
      subtitle={`${patient.mrn} · ${patient.meta}`}
      pills={[
        { label: patient.payor, tone: patient.payorTone },
        patient.balance
          ? { label: `Balance ${formatPeso(patient.balance)}`, tone: "warn" }
          : { label: "Settled", tone: "accent" },
        { label: "Consent on file", tone: "neutral" },
      ]}
      rows={[
        { label: "Treatment plan", value: patient.plan },
        { label: "Last visit", value: patient.lastVisit },
        { label: "Assigned", value: PATIENT_RECORD.assigned },
        { label: "Allergies", value: PATIENT_RECORD.allergies },
        { label: "Branch", value: branch.name },
      ]}
      historyTitle="Visit history"
      history={PATIENT_RECORD.visits.map((visit) => (
        <li key={visit.when} className="flex gap-2.5 border-t border-console-line pt-2">
          <span className="w-16 shrink-0 font-data text-[11px] text-console-subtle">{visit.when}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{visit.title}</p>
            <p className="text-[11px] text-console-subtle">{visit.meta}</p>
          </div>
        </li>
      ))}
      actions={patientDrawerActions(patient.name)}
    />
  );
}
