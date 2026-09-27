"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QUEUES } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import type { Branch, PendingAppointment } from "@/src/types/clinix-app";
import { Kicker } from "../kicker";
import { SectionHeading } from "../section-heading";
import { StatTile } from "../stat-tile";
import { EyePrescriptionPanel } from "../specialty/eye-prescription-panel";
import { KennelMonitorPanel } from "../specialty/kennel-monitor-panel";
import { OdontogramPanel } from "../specialty/odontogram-panel";
import { SupplyAlertsPanel } from "../specialty/supply-alerts-panel";
import { QueueRow } from "./queue-row";

type BranchHomeScreenProps = {
  branch: Branch;
  /** Assistants run the floor but do not see the day's takings. */
  canSeeRevenue: boolean;
  /** Only the owner gets the console bridge. */
  canManageClinic: boolean;
  pending: PendingAppointment[];
  onConfirm: (appointment: PendingAppointment) => void;
};

export function BranchHomeScreen({ branch, canSeeRevenue, canManageClinic, pending, onConfirm }: BranchHomeScreenProps) {
  const queue = QUEUES[branch.key];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-2">
        <StatTile
          label="Revenue today"
          value={canSeeRevenue ? formatPeso(branch.revenue) : "Restricted"}
          muted={!canSeeRevenue}
        />
        <StatTile label={queue.countLabel} value={String(branch.patients)} />
      </div>

      {pending.length > 0 ? (
        <section className="flex flex-col gap-2.5 rounded-xl bg-brand/10 p-3">
          <Kicker className="text-brand-700">Pending confirmations · {pending.length}</Kicker>
          <ul className="flex flex-col gap-2.5">
            {pending.map((appointment) => (
              <li key={appointment.id} className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[13.5px] font-extrabold text-slate-900">{appointment.patient}</div>
                  <div className="truncate text-[11px] text-slate-600">
                    {appointment.service} · {appointment.when}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onConfirm(appointment)}
                  className="min-h-11 shrink-0 cursor-pointer rounded-lg bg-brand px-3 text-[12px] font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Confirm
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SectionHeading title={queue.title} aside={`${queue.items.length} waiting`} />
      <ul className="flex flex-col gap-3">
        {queue.items.map((entry) => (
          <QueueRow key={entry.no} entry={entry} />
        ))}
      </ul>

      {branch.key === "bgc-dental" ? <OdontogramPanel /> : null}
      {branch.key === "makati-vet" ? <KennelMonitorPanel /> : null}
      {branch.key === "qc-eye" ? <EyePrescriptionPanel /> : null}
      <SupplyAlertsPanel branch={branch.key} />

      {canManageClinic ? <ManageClinicRow /> : null}
    </div>
  );
}

/** The owner's single bridge from the floor into setup — the console owns those screens. */
function ManageClinicRow() {
  return (
    <Link
      href={CLINIX_ROUTES.admin}
      className="flex min-h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="min-w-0">
        <span className="block font-display text-[13.5px] font-extrabold text-slate-900">Manage clinic</span>
        <span className="block text-[11px] text-slate-500">Services, staff, stock, claims and settings</span>
      </span>
      <ChevronRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-brand" />
    </Link>
  );
}
