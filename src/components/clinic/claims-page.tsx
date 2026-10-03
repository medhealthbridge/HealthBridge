import { PageHeader } from "@/src/components/console/page-header";
import { Panel } from "@/src/components/console/panel";
import { StatGrid } from "@/src/components/console/stat-grid";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { ClaimDialog } from "@/src/components/clinic/claim-dialog";
import { ClaimStatusSelect } from "@/src/components/clinic/claim-status-select";
import { formatPeso, formatPesoExact } from "@/src/lib/utils";
import { CLAIM_STATUS_LABELS } from "@/src/lib/schemas/claim";
import { listPatients, type StaffClinic } from "@/src/server/services/clinic-app";
import { listClaims, summarizeClaims } from "@/src/server/services/claims";

/** Shared by the owner console and the front-desk app. Owner and front desk file and update; only the owner withdraws. */
export async function ClaimsPage({ clinic }: { clinic: StaffClinic }) {
  const [rows, { rows: patients }] = await Promise.all([listClaims(clinic.id), listPatients(clinic.id, "", false)]);
  const summary = summarizeClaims(rows);
  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: clinic.timezone });
  const patientOptions = patients.map((p) => ({ id: p.id, label: `${p.name} · ${p.mrn}` }));

  return (
    <>
      <PageHeader title="Claims & receivables" description="PhilHealth and HMO claims, aged from the day they were filed." actions={<ClaimDialog patients={patientOptions} />} />
      <StatGrid
        stats={[
          { label: "Outstanding", value: formatPeso(summary.outstandingCents / 100), sub: `${summary.openCount} open ${summary.openCount === 1 ? "claim" : "claims"}` },
          { label: "Over 60 days", value: formatPeso(summary.overSixtyCents / 100), sub: "Open claims older than 60 days", tone: summary.overSixtyCents > 0 ? "warn" : "neutral" },
          { label: "Denied", value: String(summary.deniedCount), sub: "Resubmit with corrections", tone: summary.deniedCount > 0 ? "danger" : "neutral" },
        ]}
        columns={3}
      />
      {rows.length === 0 ? (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">No claims yet. File one when a patient&rsquo;s visit is covered by PhilHealth or an HMO.</Panel>
      ) : (
        <TableCard label="Claims">
          <thead>
            <tr><Th>Patient</Th><Th>Payor</Th><Th>LOA / member</Th><Th numeric>Amount</Th><Th>Filed</Th><Th>Age</Th><Th>Status</Th><Th className="w-20"><span className="sr-only">Actions</span></Th></tr>
          </thead>
          <tbody>
            {rows.map((claim) => (
              <Tr key={claim.id}>
                <Td>{claim.patientName} <span className="text-console-muted">{claim.patientMrn}</span></Td>
                <Td>{claim.payorName} <Pill tone="neutral">{claim.payorType === "philhealth" ? "PhilHealth" : "HMO"}</Pill></Td>
                <Td className="font-data text-[12px] text-console-muted">{claim.loaNumber ?? claim.memberOrPolicyNumber ?? "—"}</Td>
                <Td numeric>{formatPesoExact(claim.claimAmountCents / 100)}</Td>
                <Td className="whitespace-nowrap text-console-muted">{claim.filedAt ? when.format(claim.filedAt) : "—"}</Td>
                <Td className="whitespace-nowrap text-console-muted">{claim.status === "paid" || claim.status === "withdrawn" ? "—" : `${claim.ageDays} d`}</Td>
                <Td><span className="sr-only">{CLAIM_STATUS_LABELS[claim.status]}</span><ClaimStatusSelect id={claim.id} status={claim.status} canWithdraw={clinic.role === "owner"} /></Td>
                <Td><RowActions>{claim.status !== "paid" && claim.status !== "withdrawn" && <ClaimDialog claim={claim} patients={patientOptions} />}</RowActions></Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
