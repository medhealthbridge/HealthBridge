import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { platformRoleOf } from "@/src/server/services/access";
import { listPlatformPeople } from "@/src/server/services/platform-staff";
import { PageHeader } from "@/src/components/console/page-header";
import { InviteAdminDialog } from "./_components/invite-admin-dialog";
import { PlatformStaffTable } from "./_components/platform-staff-table";

export const metadata: Metadata = { title: "Company staff" };

export default async function CompanyStaffPage() {
  const admin = await requirePlatformAdmin();
  const canManage = (await platformRoleOf(admin.id)) === "super_admin";

  return (
    <>
      <PageHeader
        title="Company staff"
        description="Everyone with access to this admin."
        actions={canManage ? <InviteAdminDialog /> : undefined}
      />
      <PlatformStaffTable people={await listPlatformPeople()} currentUserId={admin.id} canManage={canManage} />
    </>
  );
}
