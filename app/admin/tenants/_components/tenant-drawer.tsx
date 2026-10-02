"use client";

import { DetailDrawer } from "@/src/components/console/detail-drawer";
import { Pill } from "@/src/components/console/pill";
import { TENANT_STATUS_TONE } from "@/src/lib/tenant-status";
import type { TenantRow } from "@/src/server/services/tenants";
import { formatPeso } from "@/src/lib/utils";

export function TenantDrawer({ tenant, onClose }: { tenant: TenantRow | null; onClose: () => void }) {
  if (!tenant) return null;

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={tenant.name}
      subtitle={tenant.email}
      pills={[
        { label: tenant.tier, tone: "neutral" },
        { label: tenant.status, tone: TENANT_STATUS_TONE[tenant.status] },
        { label: `${tenant.clinics} ${tenant.clinics === 1 ? "clinic" : "clinics"}`, tone: "neutral" },
      ]}
      rows={[
        { label: "MRR", value: tenant.mrr ? formatPeso(tenant.mrr) : "—" },
        { label: "Renews / trial ends", value: tenant.renews },
        { label: "Clinics", value: String(tenant.clinics) },
        { label: "Joined", value: tenant.joined },
      ]}
      historyTitle="Clinics"
      history={tenant.clinicList.map((clinic) => (
        <li key={clinic.subdomain} className="flex items-center justify-between gap-2.5 border-t border-console-line pt-2">
          <p className="min-w-0 truncate text-xs">{clinic.name}</p>
          <Pill className="font-data">{clinic.subdomain}</Pill>
        </li>
      ))}
      actions={[]}
    />
  );
}
