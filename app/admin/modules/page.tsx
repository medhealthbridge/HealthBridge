import type { Metadata } from "next";
import { ModuleGrid } from "@/src/components/console/module-grid";
import { PageHeader } from "@/src/components/console/page-header";
import { PLATFORM_MODULES } from "@/src/lib/mock-data/company-admin";

export const metadata: Metadata = { title: "Module marketplace" };

export default function ModuleMarketplacePage() {
  return (
    <>
      <PageHeader title="Module marketplace" description="What’s live across the platform, and adoption by tenant." />
      <ModuleGrid
        modules={PLATFORM_MODULES}
        stateLabels={["Live", "Not released"]}
        toastSuffixes={[" turned on platform-wide", " turned off platform-wide"]}
      />
    </>
  );
}
