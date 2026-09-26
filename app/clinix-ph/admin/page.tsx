import { ActionListCard } from "@/src/components/console/action-list-card";
import { KpiGrid } from "@/src/components/console/kpi-grid";
import { MeterListCard } from "@/src/components/console/meter-list-card";
import { PageHeader } from "@/src/components/console/page-header";
import { RangeTabs } from "@/src/components/console/range-tabs";
import { StatGrid } from "@/src/components/console/stat-grid";
import {
  CLINIX_AS_OF,
  CLINIX_KPIS,
  CLINIX_OPS_TILES,
  COLLECTIONS_BY_METHOD,
  LOW_STOCK,
} from "@/src/lib/mock-data/clinix-admin";
import { ActiveBranchName } from "./_components/branch-context";
import { LiveQueueCard } from "./_components/live-queue-card";

export default function ClinixOverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description={
          <>
            <ActiveBranchName /> · {CLINIX_AS_OF}
          </>
        }
        actions={<RangeTabs />}
      />
      <KpiGrid kpis={CLINIX_KPIS} />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1.9fr_1fr]">
        <LiveQueueCard />
        <div className="flex min-w-0 flex-col gap-3.5">
          <MeterListCard title="Collections by method" rows={COLLECTIONS_BY_METHOD} />
          <ActionListCard title="Low stock" items={LOW_STOCK} />
        </div>
      </div>
      <StatGrid stats={CLINIX_OPS_TILES} columns={3} />
    </>
  );
}
