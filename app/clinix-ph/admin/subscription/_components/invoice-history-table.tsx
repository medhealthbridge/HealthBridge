import { Panel, PanelHeader } from "@/src/components/console/panel";

/** Invoices don't exist until the trial converts, so today this is always empty. */
export function InvoiceHistoryTable({ trialing }: { trialing: boolean }) {
  return (
    <Panel>
      <PanelHeader title="Invoice history" />
      <p className="px-3.5 py-6 text-[13px] text-console-muted">
        {trialing ? "No invoices yet. Your free trial doesn\u2019t need a card." : "No invoices yet."}
      </p>
    </Panel>
  );
}
