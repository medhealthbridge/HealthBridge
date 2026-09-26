import { ActionListCard } from "@/src/components/console/action-list-card";
import { KpiGrid } from "@/src/components/console/kpi-grid";
import { MeterListCard } from "@/src/components/console/meter-list-card";
import { PageHeader } from "@/src/components/console/page-header";
import { RangeTabs } from "@/src/components/console/range-tabs";
import { StatGrid } from "@/src/components/console/stat-grid";
import {
  COMPANY_AS_OF,
  COMPANY_KPIS,
  COMPANY_OPS_TILES,
  MRR_BY_TIER,
  NEEDS_ATTENTION,
} from "@/src/lib/mock-data/company-admin";
import { TenantActivityCard } from "./_components/tenant-activity-card";

export default function CompanyOverviewPage() {
  return (
    <>
      <PageHeader title="Company overview" description={`All tenants · ${COMPANY_AS_OF}`} actions={<RangeTabs />} />
      <KpiGrid kpis={COMPANY_KPIS} />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1.9fr_1fr]">
        <TenantActivityCard />
        <div className="flex min-w-0 flex-col gap-3.5">
          <MeterListCard title="MRR by tier" rows={MRR_BY_TIER} />
          <ActionListCard title="Needs attention" items={NEEDS_ATTENTION} />
        </div>
      </div>
      <StatGrid stats={COMPANY_OPS_TILES} columns={3} />
    </>
  );
}
