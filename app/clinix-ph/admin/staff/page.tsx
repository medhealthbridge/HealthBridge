import type { Metadata } from "next";
import { requireWorkspace } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { listClinicPeople } from "@/src/server/services/workspace";
import { PeopleTable } from "./_components/people-table";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  const { workspace } = await requireWorkspace();
  const people = (await Promise.all(workspace.clinics.map((clinic) => listClinicPeople(clinic.id)))).flat();
  const branchNames = Object.fromEntries(workspace.clinics.map((clinic) => [clinic.id, clinic.name]));

  return (
    <>
      <PageHeader title="Staff & roles" description="Everyone with access to your clinics." />
      <PeopleTable people={people} branchNames={branchNames} />
      {people.some((person) => person.state === "invited") && (
        <p className="text-xs text-console-muted">
          Invites are saved but not emailed yet, so an invited person can&rsquo;t join until sending is built.
        </p>
      )}
    </>
  );
}
