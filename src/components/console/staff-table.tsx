"use client";

import { useState } from "react";
import type { StaffMember, StaffStatus, Tone } from "@/src/types/console";
import { ConsoleButton } from "./console-button";
import { RowActions, TableCard, Td, Th, Tr } from "./data-table";
import { Pill } from "./pill";
import { useToast } from "./toast";

const STATUS_TONE: Record<StaffStatus, Tone> = { Active: "accent", Invited: "info", Deactivated: "danger" };

type StaffTableProps = {
  staff: StaffMember[];
  /** Header for each member's `detail` column, e.g. "Branch" or "Last active". */
  detailLabel: string;
  /** Toast after disabling someone, e.g. " deactivated — records retained". */
  deactivatedSuffix: string;
};

export function StaffTable({ staff: initial, detailLabel, deactivatedSuffix }: StaffTableProps) {
  const toast = useToast();
  const [staff, setStaff] = useState(initial);

  function toggle(member: StaffMember) {
    const restoring = member.status === "Deactivated";
    setStaff((current) => current.map((m) => (m.id === member.id ? { ...m, status: restoring ? "Active" : "Deactivated" } : m)));
    toast(member.name + (restoring ? " restored" : deactivatedSuffix));
  }

  return (
    <TableCard label="Staff">
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>{detailLabel}</Th>
          <Th>Status</Th>
          <Th className="w-28">
            <span className="sr-only">Actions</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {staff.map((member) => (
          <Tr key={member.id}>
            <Td className="font-semibold">{member.name}</Td>
            <Td className="font-data text-xs text-console-muted">{member.email}</Td>
            <Td>
              <Pill>{member.role}</Pill>
            </Td>
            <Td className="text-console-muted">{member.detail}</Td>
            <Td>
              <Pill tone={STATUS_TONE[member.status]}>{member.status}</Pill>
            </Td>
            <Td>
              {member.role !== "Owner" && (
                <RowActions>
                  <ConsoleButton size="sm" onClick={() => toggle(member)} aria-label={`${member.status === "Deactivated" ? "Restore" : "Disable"} ${member.name}`}>
                    {member.status === "Deactivated" ? "Restore" : "Disable"}
                  </ConsoleButton>
                </RowActions>
              )}
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
