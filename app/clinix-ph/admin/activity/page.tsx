import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { AuditLogList } from "@/src/components/console/audit-log-list";
import { consoleButtonClass } from "@/src/components/console/console-button";
import { PageHeader } from "@/src/components/console/page-header";
import { Panel } from "@/src/components/console/panel";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { ACTIVITY_FILTERS, listActivity } from "@/src/server/services/activity";

export const metadata: Metadata = { title: "Activity log" };

export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  const requested = (await searchParams).type;
  const active = ACTIVITY_FILTERS.find((filter) => filter.key === requested)?.key ?? "all";
  const entries = await listActivity(clinic.id, clinic.timezone, { filter: active });

  return (
    <>
      <PageHeader title="Activity log" description="Who did what, and who opened which record. The latest 100 entries." />
      <nav aria-label="Filter activity" className="flex flex-wrap gap-1.5">
        {ACTIVITY_FILTERS.map((filter) => (
          <Link key={filter.key} href={filter.key === "all" ? `${CLINIX_ROUTES.admin}/activity` : `${CLINIX_ROUTES.admin}/activity?type=${filter.key}`} aria-current={active === filter.key ? "page" : undefined} className={consoleButtonClass(active === filter.key ? "primary" : "secondary", "sm")}>
            {filter.label}
          </Link>
        ))}
      </nav>
      {entries.length === 0 ? <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">Nothing here yet.</Panel> : <AuditLogList entries={entries} />}
    </>
  );
}
