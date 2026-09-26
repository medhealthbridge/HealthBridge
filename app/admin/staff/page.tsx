import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { StaffTable } from "@/src/components/console/staff-table";
import { ToastButton } from "@/src/components/console/toast";
import { COMPANY_STAFF } from "@/src/lib/mock-data/company-admin";

export const metadata: Metadata = { title: "Company staff" };

export default function CompanyStaffPage() {
  return (
    <>
      <PageHeader
        title="Company staff"
        actions={
          <ToastButton variant="primary" message="Invite sheet opened">
            + Invite admin
          </ToastButton>
        }
      />
      <StaffTable staff={COMPANY_STAFF} detailLabel="Last active" deactivatedSuffix=" deactivated" />
    </>
  );
}
