"use client";

import { DetailDrawer } from "@/src/components/console/detail-drawer";
import { Pill } from "@/src/components/console/pill";
import {
  TENANT_DRAWER_EVENTS,
  TENANT_DRAWER_MODULES,
  tenantDrawerActions,
  tenantDrawerPills,
  type Tenant,
} from "@/src/lib/mock-data/company-admin";
import { formatPeso } from "@/src/lib/utils";

export function TenantDrawer({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  if (!tenant) return null;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={tenant.name}
      subtitle={tenant.email}
      pills={tenantDrawerPills(tenant)}
      rows={[
        { label: "MRR", value: tenant.mrr ? formatPeso(tenant.mrr) : "—" },
        { label: "Renews / trial ends", value: tenant.renews },
        { label: "Clinics", value: String(tenant.clinics) },
        { label: "Modules enabled", value: TENANT_DRAWER_MODULES },
      ]}
      historyTitle="Recent activity"
      history={TENANT_DRAWER_EVENTS.map((event) => (
        <li key={event.action} className="flex gap-2.5 border-t border-console-line pt-2">
          <Pill tone={event.tone} className="font-data">
            {event.action}
          </Pill>
          <div className="min-w-0 flex-1">
            <p className="text-xs">{event.meta}</p>
            <p className="font-data text-[10px] text-console-subtle">{event.when}</p>
          </div>
        </li>
      ))}
      actions={tenantDrawerActions(tenant.name)}
    />
  );
}
