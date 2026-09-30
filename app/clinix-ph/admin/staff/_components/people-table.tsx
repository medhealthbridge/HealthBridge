import { TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Pill } from "@/src/components/console/pill";
import type { Tone } from "@/src/types/console";
import type { ClinicPerson } from "@/src/server/services/workspace";

const ROLE_LABEL: Record<ClinicPerson["role"], string> = {
  owner: "Owner",
  practitioner: "Practitioner",
  assistant: "Assistant",
};

const STATE: Record<ClinicPerson["state"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "accent" },
  invited: { label: "Invited", tone: "info" },
  deactivated: { label: "Deactivated", tone: "danger" },
};

type PeopleTableProps = { people: ClinicPerson[]; branchNames: Record<string, string> };

/** Read-only: enabling and disabling people is not built, so no buttons pretend to. */
export function PeopleTable({ people, branchNames }: PeopleTableProps) {
  return (
    <TableCard label="Staff">
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Role</Th>
          <Th>Branch</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <Tr key={person.id}>
            <Td className="font-semibold">{person.name ?? <span className="font-normal text-console-subtle">Not joined yet</span>}</Td>
            <Td className="font-data text-xs text-console-muted">{person.email}</Td>
            <Td>
              <Pill>{ROLE_LABEL[person.role]}</Pill>
            </Td>
            <Td className="text-console-muted">{branchNames[person.clinicId]}</Td>
            <Td>
              <Pill tone={STATE[person.state].tone}>{STATE[person.state].label}</Pill>
            </Td>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  );
}
