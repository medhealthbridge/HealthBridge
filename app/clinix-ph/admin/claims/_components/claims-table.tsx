import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { ToastButton } from "@/src/components/console/toast";
import { CLAIM_STATUS_TONE, CLAIMS } from "@/src/lib/mock-data/clinix-admin";
import { formatPeso } from "@/src/lib/utils";

function ageClass(days: number) {
  if (days > 60) return "text-console-danger";
  if (days > 30) return "text-console-warn";
  return "text-console-muted";
}

export function ClaimsTable() {
  return (
    <TableCard label="Claims">
      <thead>
        <tr>
          <Th>Claim</Th>
          <Th>Payor</Th>
          <Th>Patient</Th>
          <Th numeric>Amount</Th>
          <Th numeric>Age</Th>
          <Th>Status</Th>
          <Th className="w-28">
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {CLAIMS.map((claim) => (
          <Tr key={claim.id}>
            <Td className="font-data text-xs">{claim.id}</Td>
            <Td>
              <Pill>{claim.payor}</Pill>
            </Td>
            <Td className="font-semibold">{claim.patient}</Td>
            <Td numeric>{formatPeso(claim.amount)}</Td>
            <Td numeric className={ageClass(claim.ageDays)}>
              {claim.ageDays}d
            </Td>
            <Td>
              <Pill tone={CLAIM_STATUS_TONE[claim.status]}>{claim.status}</Pill>
            </Td>
            <Td>
              {claim.status === "Denied" && (
                <ToastButton size="sm" message={`Resubmitted · ${claim.id}`} aria-label={`Resubmit claim ${claim.id}`}>
                  Resubmit
                </ToastButton>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
