"use client";

import { useState, useTransition } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import { useToast } from "@/src/components/console/toast";
import { revokeInviteAction, setStaffActiveAction } from "@/src/server/actions/platform-staff";
import type { PlatformPerson } from "@/src/server/services/platform-staff";
import type { Tone } from "@/src/types/console";

const STATE: Record<PlatformPerson["state"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "accent" },
  invited: { label: "Invited", tone: "info" },
  deactivated: { label: "Deactivated", tone: "danger" },
};
const ROLE = { super_admin: "Super admin", staff: "Staff" } as const;

const dateFormat = new Intl.DateTimeFormat("en-PH", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila" });

export function PlatformStaffTable({ people, currentUserId, canManage }: { people: PlatformPerson[]; currentUserId: string; canManage: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function toggle(person: PlatformPerson) {
    const data = new FormData();
    data.set("userId", person.userId ?? "");
    data.set("active", String(person.state === "deactivated"));
    start(async () => {
      const result = await setStaffActiveAction(data);
      setError(result.message ?? "");
      if (!result.message) toast(person.state === "deactivated" ? `${person.name} restored` : `${person.name} deactivated`);
    });
  }

  function revoke(person: PlatformPerson) {
    const data = new FormData();
    data.set("inviteId", person.key);
    start(async () => {
      await revokeInviteAction(data);
      toast(`Invitation to ${person.email} revoked`);
    });
  }

  return (
    <>
      <TableCard label="Company staff">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Since</Th>
            <Th>Status</Th>
            <Th className="w-28"><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <Tr key={person.key}>
              <Td className="font-semibold">
                {person.name}
                {person.userId === currentUserId && <span className="ml-1.5 text-[11px] font-normal text-console-subtle">(you)</span>}
              </Td>
              <Td className="font-data text-xs text-console-muted">{person.email}</Td>
              <Td><Pill>{ROLE[person.role]}</Pill></Td>
              <Td className="text-console-muted">{dateFormat.format(person.since)}</Td>
              <Td><Pill tone={STATE[person.state].tone}>{STATE[person.state].label}</Pill></Td>
              <Td>
                {canManage && person.state === "invited" && (
                  <RowActions>
                    <ConsoleButton size="sm" disabled={pending} onClick={() => revoke(person)} aria-label={`Revoke invitation to ${person.email}`}>Revoke</ConsoleButton>
                  </RowActions>
                )}
                {canManage && person.userId && person.role === "staff" && person.userId !== currentUserId && (
                  <RowActions>
                    <ConsoleButton size="sm" disabled={pending} onClick={() => toggle(person)} aria-label={`${person.state === "deactivated" ? "Restore" : "Deactivate"} ${person.name}`}>
                      {person.state === "deactivated" ? "Restore" : "Deactivate"}
                    </ConsoleButton>
                  </RowActions>
                )}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableCard>
      {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
    </>
  );
}
