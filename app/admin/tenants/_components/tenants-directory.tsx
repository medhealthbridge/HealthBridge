"use client";

import { useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { RowActions, TableCard, Td, Th, Tr } from "@/src/components/console/data-table";
import { Monogram } from "@/src/components/console/monogram";
import { PageHeader } from "@/src/components/console/page-header";
import { Pill } from "@/src/components/console/pill";
import { ToastButton } from "@/src/components/console/toast";
import { TENANT_STATUS_TONE, TENANT_STATUSES, type Tenant, type TenantStatus } from "@/src/lib/mock-data/company-admin";
import { formatPeso } from "@/src/lib/utils";
import { TenantDrawer } from "./tenant-drawer";

type StatusFilter = "All" | TenantStatus;

/** Header filters, the tenant table and the tenant drawer share search/filter/selection state. */
export function TenantsDirectory({ tenants }: { tenants: Tenant[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [selected, setSelected] = useState<Tenant | null>(null);

  const needle = search.trim().toLowerCase();
  const rows = tenants.filter(
    (t) => (status === "All" || t.status === status) && (!needle || `${t.name} ${t.email}`.toLowerCase().includes(needle)),
  );

  return (
    <>
      <PageHeader
        title="Tenants"
        description={`${tenants.length} accounts · ${rows.length} shown`}
        actions={
          <>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search tenants by name or email"
              className={`${CONSOLE_INPUT} w-full sm:w-48`}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              aria-label="Filter by status"
              className={`${CONSOLE_INPUT} cursor-pointer`}
            >
              {(["All", ...TENANT_STATUSES] as const).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ToastButton message="CSV export queued — check your email">Export CSV</ToastButton>
            <ToastButton variant="primary" message="Opening the new tenant form">
              + New tenant
            </ToastButton>
          </>
        }
      />

      <TableCard label="Tenants">
        <thead>
          <tr>
            <Th>Account</Th>
            <Th>Tier</Th>
            <Th>Status</Th>
            <Th numeric>Clinics</Th>
            <Th numeric>MRR</Th>
            <Th>Renews</Th>
            <Th className="w-24">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tenant) => (
            <Tr key={tenant.key} onClick={() => setSelected(tenant)} className="cursor-pointer">
              <Td>
                <div className="flex items-center gap-2.5">
                  <Monogram name={tenant.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tenant.name}</p>
                    <p className="font-data text-[11px] text-console-subtle">{tenant.email}</p>
                  </div>
                </div>
              </Td>
              <Td>
                <Pill>{tenant.tier}</Pill>
              </Td>
              <Td>
                <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{tenant.status}</Pill>
              </Td>
              <Td numeric>{tenant.clinics}</Td>
              <Td numeric>{tenant.mrr ? formatPeso(tenant.mrr) : "—"}</Td>
              <Td className="font-data text-xs text-console-muted">{tenant.renews}</Td>
              <Td>
                <RowActions>
                  <ConsoleButton size="sm" onClick={() => setSelected(tenant)} aria-label={`View ${tenant.name}`}>
                    View
                  </ConsoleButton>
                </RowActions>
              </Td>
            </Tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <Td colSpan={7} className="py-6 text-center text-console-subtle">
                No tenants match these filters.
              </Td>
            </tr>
          )}
        </tbody>
      </TableCard>

      <TenantDrawer tenant={selected} onClose={() => setSelected(null)} />
    </>
  );
}
