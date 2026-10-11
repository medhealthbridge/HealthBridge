// Content of app/clinix-ph/admin/staff/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { listClinicPeople } from "@/src/server/services/workspace";
import { InviteStaffDialog } from "@/app/clinix-ph/admin/staff/_components/invite-staff-dialog";
import { PeopleTable } from "@/app/clinix-ph/admin/staff/_components/people-table";


export default async function StaffPageView() {
  const { clinic } = await requireActiveClinicOwner();
  const people = await listClinicPeople(clinic.id);

  return (
    <>
      <PageHeader title="Staff & roles" description={`Everyone with access to ${clinic.name}. Deactivating keeps their records.`} actions={<InviteStaffDialog />} />
      <PeopleTable people={people} branchNames={{ [clinic.id]: clinic.name }} ownStaffId={clinic.staffId} />
    </>
  );
}
