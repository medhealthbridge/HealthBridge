import Link from "next/link";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { KpiGrid } from "@/src/components/console/kpi-grid";
import { MeterListCard } from "@/src/components/console/meter-list-card";
import { PageHeader } from "@/src/components/console/page-header";
import { Kicker, Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { StatGrid } from "@/src/components/console/stat-grid";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { getOverview } from "@/src/server/services/overview";
import { ActiveBranchName } from "./_components/branch-context";
import { LiveQueueCard } from "./_components/live-queue-card";

export default async function ClinixOverviewPage() {
  const { clinic } = await requireActiveClinicOwner();
  const overview = await getOverview(clinic);

  return (
    <>
      <PageHeader title="Overview" description={<><ActiveBranchName /> · {overview.asOf}</>} />
      <KpiGrid kpis={overview.kpis} />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1.9fr_1fr]">
        <LiveQueueCard queue={overview.queue} summary={overview.queueSummary} timezone={clinic.timezone} />
        <div className="flex min-w-0 flex-col gap-3.5">
          {overview.collections.length > 0 ? (
            <MeterListCard title="Collections by method (30 days)" rows={overview.collections} />
          ) : (
            <Panel className="p-3.5 text-[13px] text-console-muted"><Kicker>Collections by method</Kicker><p className="mt-2">Payments will show here after your first checkout.</p></Panel>
          )}
          <Panel className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-center justify-between">
              <Kicker>Stock needing attention</Kicker>
              <Pill tone={overview.lowStock.length ? "warn" : "accent"}>{overview.lowStock.length}</Pill>
            </div>
            {overview.lowStock.length === 0 ? (
              <p className="text-[13px] text-console-muted">Nothing is low or expiring.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.lowStock.map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5 border-t border-console-line pt-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{item.name}</p>
                      <p className="font-data text-[11px] text-console-subtle">{item.onHand} left · reorder at {item.reorderThreshold}{item.expiredQty > 0 ? ` · ${item.expiredQty} expired` : ""}</p>
                    </div>
                    <Pill tone={item.status === "out" ? "danger" : "warn"}>{item.status === "out" ? "Out" : item.status === "low" ? "Low" : "Expiry"}</Pill>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`${CLINIX_ROUTES.admin}/inventory`} className="text-xs font-semibold text-console-accent underline">Open inventory</Link>
          </Panel>
        </div>
      </div>
      <StatGrid stats={overview.stats} columns={3} />
    </>
  );
}
