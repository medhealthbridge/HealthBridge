import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { CUSTOM_FIELDS } from "@/src/lib/mock-data/clinix-admin";
import { ActiveBranchName } from "../_components/branch-context";
import { CustomFieldsSettings } from "./_components/custom-fields-settings";
import { VerticalCard } from "./_components/vertical-card";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description={
          <>
            Clinic profile and custom fields for <ActiveBranchName />.
          </>
        }
      />
      <VerticalCard />
      <CustomFieldsSettings fields={CUSTOM_FIELDS} />
    </>
  );
}
