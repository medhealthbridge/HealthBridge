import type { Metadata } from "next";
import { requireClinicOwner } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { StaffTable } from "@/src/components/console/staff-table";
import { ToastButton } from "@/src/components/console/toast";
import { CLINIX_STAFF } from "@/src/lib/mock-data/clinix-admin";
import { ImportButton } from "../_components/import-button";

export const metadata: Metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  await requireClinicOwner();

  return (
    <>
      <PageHeader
        title="Staff & roles"
        actions={
          <>
            <ImportButton kind="staff" />
            <ToastButton variant="primary" message="Invite sheet opened">
              + Invite staff
            </ToastButton>
          </>
        }
      />
      <StaffTable staff={CLINIX_STAFF} detailLabel="Branch" deactivatedSuffix=" deactivated — records retained" />
    </>
  );
}
