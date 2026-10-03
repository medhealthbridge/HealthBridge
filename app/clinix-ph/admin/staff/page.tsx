import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { listClinicPeople } from "@/src/server/services/workspace";
import { InviteStaffDialog } from "./_components/invite-staff-dialog";
import { PeopleTable } from "./_components/people-table";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  const { clinic } = await requireActiveClinicOwner();
  const people = await listClinicPeople(clinic.id);

  return (
    <>
      <PageHeader title="Staff & roles" description={`Everyone with access to ${clinic.name}. Deactivating keeps their records.`} actions={<InviteStaffDialog />} />
      <PeopleTable people={people} branchNames={{ [clinic.id]: clinic.name }} ownStaffId={clinic.staffId} />
    </>
  );
}
