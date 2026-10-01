import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import type { Tone } from "@/src/types/console";
import { formatCentavos } from "@/src/lib/pricing";

type Order = { domain: string; status: string; totalCentavos: number };

const STATUS: Record<string, { label: string; tone: Tone; note: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "warn", note: "Finish checkout and the domain is set up automatically." },
  paid: { label: "Setting up", tone: "info", note: "Payment received. Registering your domain." },
  purchasing: { label: "Setting up", tone: "info", note: "Registering your domain. This usually takes a few minutes." },
  active: { label: "Live", tone: "accent", note: "Your clinic is served on this domain. It renews yearly." },
  needs_review: { label: "Needs attention", tone: "danger", note: "Your payment went through but the domain isn't live yet. We're on it — you'll hear from us shortly." },
  expired: { label: "Expired", tone: "neutral", note: "Checkout wasn't completed." },
};

/** Where a custom-domain purchase stands; absent until one has been started. */
export function DomainStatusCard({ order }: { order: Order | null }) {
  if (!order) return null;
  const status = STATUS[order.status] ?? STATUS.expired;
  return (
    <Panel>
      <PanelHeader title="Custom domain">
        <Pill tone={status.tone}>{status.label}</Pill>
      </PanelHeader>
      <div className="flex flex-col gap-1 px-3.5 py-3">
        <p className="font-data text-sm font-semibold">{order.domain}</p>
        <p className="text-xs text-console-muted">{status.note}</p>
        <p className="text-[11px] text-console-subtle">Charged {formatCentavos(order.totalCentavos)} (first month + 1 year of domain).</p>
      </div>
    </Panel>
  );
}
