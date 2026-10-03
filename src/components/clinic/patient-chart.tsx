import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { ArchiveButton } from "@/src/components/console/archive-button";
import { PageHeader } from "@/src/components/console/page-header";
import { setPatientArchivedAction } from "@/src/server/actions/clinic-app";
import type { PatientChart } from "@/src/server/services/clinic-app";
import type { ClinicalNote } from "@/src/server/services/clinical-notes";
import { PatientEmailDialog } from "./patient-email-dialog";
import { InvitePortalDialog } from "./invite-portal-dialog";
import { NotesPanel } from "./notes-panel";
import type { Tone } from "@/src/types/console";
import { ageOf } from "./patients-panel";
import { PatientDialog } from "./patient-dialog";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "warn" },
  confirmed: { label: "Booked", tone: "info" },
  checked_in: { label: "Waiting", tone: "warn" },
  in_progress: { label: "In chair", tone: "accent" },
  completed: { label: "Done", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "danger" },
};
const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

const Row = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex justify-between gap-4 border-b border-console-line py-2 text-[13px] last:border-0">
    <dt className="text-console-muted">{label}</dt>
    <dd className="text-right font-medium">{value ?? "—"}</dd>
  </div>
);

/** One patient: details, visit history, and (for staff who may write) edit and archive. */
export function PatientChartView({ chart, backHref, canWrite, notes, canWriteNotes, canInvite = false }: { chart: PatientChart; backHref: string; canWrite: boolean; /** Null for roles that don't see clinical notes (the front desk). */ notes: ClinicalNote[] | null; canWriteNotes: boolean; /** Owner and front desk may invite a patient to the read-only portal. */ canInvite?: boolean }) {
  const { patient, visits } = chart;
  const age = ageOf(patient.dateOfBirth);
  const editable = { id: patient.id, name: patient.name, firstName: patient.firstName, lastName: patient.lastName, sex: patient.sex, dateOfBirth: patient.dateOfBirth, phone: patient.phone, philhealth: patient.philhealth, oscaId: patient.oscaId, pwdId: patient.pwdId };

  return (
    <>
      <Link href={backHref} className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] font-semibold text-console-muted hover:text-console-ink focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-0">
        <ChevronLeft aria-hidden="true" className="size-4" /> All patients
      </Link>
      <PageHeader
        title={patient.name}
        description={<>{patient.mrn}{patient.archived && <Pill tone="danger" className="ml-2">Archived</Pill>}</>}
        actions={
          canWrite ? (
            <>
              {!patient.archived && <PatientDialog patient={editable} />}
              {!patient.archived && canInvite && <PatientEmailDialog patientId={patient.id} email={patient.email} />}
              {!patient.archived && canInvite && <InvitePortalDialog patientId={patient.id} patientName={patient.name} />}
              <ArchiveButton id={patient.id} name={patient.name} noun="patient" action={setPatientArchivedAction} archived={patient.archived} consequence="They stop appearing in the list and for new bookings. Their record, visits and history are kept." />
            </>
          ) : undefined
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Details" />
          <dl className="px-3.5 py-1.5">
            <Row label="Sex" value={patient.sex === "F" ? "Female" : patient.sex === "M" ? "Male" : null} />
            <Row label="Age" value={age !== null ? `${age} years` : null} />
            <Row label="Birth date" value={patient.dateOfBirth} />
            <Row label="Mobile" value={patient.phone} />
            <Row label="PhilHealth PIN" value={patient.philhealth} />
            <Row label="Senior (OSCA) ID" value={patient.oscaId} />
            <Row label="PWD ID" value={patient.pwdId} />
          </dl>
        </Panel>
        <Panel>
          <PanelHeader title="Visits" />
          {visits.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[13px] text-console-muted">No visits yet.</p>
          ) : (
            <ul className="divide-y divide-console-line">
              {visits.map((visit) => (
                <li key={visit.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]">
                  <span>
                    {dateTime.format(visit.startsAt)}
                    {visit.practitionerName && <span className="text-console-muted"> · {visit.practitionerName}</span>}
                    {visit.source === "walk_in" && <span className="text-console-subtle"> · Walk-in</span>}
                  </span>
                  <Pill tone={STATUS[visit.status]?.tone}>{STATUS[visit.status]?.label ?? visit.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {notes && <NotesPanel notes={notes} patientId={patient.id} canWrite={canWriteNotes} />}
      </div>
    </>
  );
}
