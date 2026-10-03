"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { useToast } from "@/src/components/console/toast";
import type { Tone } from "@/src/types/console";
import { changeRoleAction, resendInviteAction, revokeInviteAction, setStaffActiveAction } from "@/src/server/actions/clinic-staff";
import type { ClinicPerson } from "@/src/server/services/workspace";

const ROLE_LABEL: Record<ClinicPerson["role"], string> = { owner: "Owner", practitioner: "Practitioner", assistant: "Assistant" };
const STATE: Record<ClinicPerson["state"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "accent" },
  invited: { label: "Invited", tone: "info" },
  deactivated: { label: "Deactivated", tone: "danger" },
};

type PeopleTableProps = { people: ClinicPerson[]; branchNames: Record<string, string>; ownStaffId: string };

export function PeopleTable({ people, branchNames, ownStaffId }: PeopleTableProps) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  /** Runs a server action for one person and reports the outcome in a toast or inline error. */
  function run(action: (data: FormData) => Promise<{ message?: string; emailed?: boolean }>, fields: Record<string, string>, success: (result: { emailed?: boolean }) => string) {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    start(async () => {
      const result = await action(data);
      setError(result.message ?? "");
      if (!result.message) toast(success(result));
    });
  }

  return (
    <>
      <TableCard label="Staff">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Branch</Th>
            <Th>Status</Th>
            <Th className="w-56"><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const protectedRow = person.role === "owner" || person.id === ownStaffId;
            return (
              <Tr key={person.id}>
                <Td className="font-semibold">{person.name ?? <span className="font-normal text-console-subtle">Not joined yet</span>}</Td>
                <Td className="font-data text-xs text-console-muted">{person.email}</Td>
                <Td>
                  {person.state !== "invited" && !protectedRow ? (
                    <select
                      aria-label={`Role for ${person.name ?? person.email}`}
                      value={person.role}
                      disabled={pending}
                      onChange={(event) => run(changeRoleAction, { staffId: person.id, role: event.target.value }, () => `${person.name ?? person.email} is now ${event.target.value}`)}
                      className={`${CONSOLE_INPUT} cursor-pointer`}
                    >
                      <option value="assistant">Assistant</option>
                      <option value="practitioner">Practitioner</option>
                    </select>
                  ) : (
                    <Pill>{ROLE_LABEL[person.role]}</Pill>
                  )}
                </Td>
                <Td className="text-console-muted">{branchNames[person.clinicId]}</Td>
                <Td><Pill tone={STATE[person.state].tone}>{STATE[person.state].label}</Pill></Td>
                <Td>
                  <RowActions>
                    <div className="flex justify-end gap-1.5">
                      {person.state === "invited" && (
                        <>
                          <ConsoleButton size="sm" disabled={pending} onClick={() => run(resendInviteAction, { inviteId: person.id }, (r) => (r.emailed ? `Invitation resent to ${person.email}` : "Saved, but the email failed"))}>Resend</ConsoleButton>
                          <ConsoleButton size="sm" variant="danger" disabled={pending} onClick={() => run(revokeInviteAction, { inviteId: person.id }, () => "Invitation revoked")}>Revoke</ConsoleButton>
                        </>
                      )}
                      {person.state !== "invited" && !protectedRow && (
                        <ConsoleButton
                          size="sm"
                          variant={person.state === "deactivated" ? "secondary" : "danger"}
                          disabled={pending}
                          onClick={() => run(setStaffActiveAction, { staffId: person.id, active: String(person.state === "deactivated") }, () => (person.state === "deactivated" ? "Restored" : "Deactivated — their records stay"))}
                          aria-label={`${person.state === "deactivated" ? "Restore" : "Deactivate"} ${person.name ?? person.email}`}
                        >
                          {person.state === "deactivated" ? "Restore" : "Deactivate"}
                        </ConsoleButton>
                      )}
                    </div>
                  </RowActions>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableCard>
      {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
    </>
  );
}
