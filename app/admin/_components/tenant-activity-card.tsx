import { Monogram } from "@/src/components/console/monogram";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { TENANT_ACTIVITY_SUMMARY, TENANT_STATUS_TONE, TENANTS } from "@/src/lib/mock-data/company-admin";
import { formatPeso } from "@/src/lib/utils";

const PREVIEW_COUNT = 6;

export function TenantActivityCard() {
  return (
    <Panel className="min-w-0">
      <PanelHeader title="Tenant activity">
        <div className="flex flex-wrap gap-1.5">
          {TENANT_ACTIVITY_SUMMARY.map((item) => (
            <Pill key={item.label} tone={item.tone}>
              {item.label}
            </Pill>
          ))}
        </div>
      </PanelHeader>
      <ul>
        {TENANTS.slice(0, PREVIEW_COUNT).map((tenant) => (
          <li key={tenant.key} className="flex items-center gap-3 border-b border-console-line px-3.5 py-2.5 last:border-b-0">
            <Monogram name={tenant.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{tenant.name}</p>
              <p className="truncate text-[11px] text-console-subtle">
                {tenant.tier} · {tenant.clinics} clinics
              </p>
            </div>
            <span className="shrink-0 font-data text-xs tabular-nums">{tenant.mrr ? formatPeso(tenant.mrr) : "—"}</span>
            <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{tenant.status}</Pill>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
