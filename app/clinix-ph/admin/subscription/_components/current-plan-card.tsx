import { Kicker, Panel } from "@/src/components/console/panel";
import { ToastButton } from "@/src/components/console/toast";
import { CURRENT_PLAN } from "@/src/lib/mock-data/clinix-admin";

export function CurrentPlanCard() {
  return (
    <Panel className="flex flex-col gap-2 border-console-accent/45 p-4">
      <Kicker>Current plan</Kicker>
      <span className="font-data text-2xl font-semibold text-console-accent">{CURRENT_PLAN.name}</span>
      <span className="text-xs text-console-muted">
        {CURRENT_PLAN.price} · renews {CURRENT_PLAN.renews}
      </span>
      <dl className="flex flex-col gap-2 border-t border-console-line pt-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-console-subtle">Branches used</dt>
          <dd className="font-data">{CURRENT_PLAN.branches}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-console-subtle">Staff seats</dt>
          <dd className="font-data">{CURRENT_PLAN.seats}</dd>
        </div>
      </dl>
      <ToastButton variant="primary" message="Opening plan comparison" className="mt-1.5">
        Upgrade plan
      </ToastButton>
    </Panel>
  );
}
