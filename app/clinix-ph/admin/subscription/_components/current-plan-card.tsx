import { Kicker, Panel } from "@/src/components/console/panel";
import type { WorkspaceSubscription } from "@/src/server/services/workspace";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  masterlocked: "Locked",
  canceled: "Canceled",
};

const dateFormat = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" });

type CurrentPlanCardProps = { subscription: WorkspaceSubscription; clinicsUsed: number };

export function CurrentPlanCard({ subscription, clinicsUsed }: CurrentPlanCardProps) {
  const { trialDaysLeft, trialEndsAt } = subscription;
  const tier = subscription.tier.replace("tier_", "Tier ");

  return (
    <Panel className="flex flex-col gap-2 border-console-accent/45 p-4">
      <Kicker>Current plan</Kicker>
      <span className="font-data text-2xl font-semibold text-console-accent">{tier}</span>
      <span className="text-xs text-console-muted">
        {STATUS_LABEL[subscription.status] ?? subscription.status}
        {trialDaysLeft !== null && trialEndsAt &&
          ` · ${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left, ends ${dateFormat.format(trialEndsAt)}`}
      </span>
      <dl className="flex flex-col gap-2 border-t border-console-line pt-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-console-subtle">Branches used</dt>
          <dd className="font-data">
            {clinicsUsed} of {subscription.clinicSlotLimit}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
