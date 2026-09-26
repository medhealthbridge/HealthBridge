import { ToastButton } from "@/src/components/console/toast";
import { EXPORT_CARDS } from "@/src/lib/mock-data/clinix-admin";
import { TransferCard } from "./transfer-card";

export function ExportCards() {
  return (
    <section aria-label="Export" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {EXPORT_CARDS.map((card) => (
        <TransferCard
          key={card.label}
          kicker="Export"
          title={card.label}
          desc={card.desc}
          action={
            <ToastButton message={card.toast} aria-label={`Export ${card.label}`}>
              Export
            </ToastButton>
          }
        />
      ))}
    </section>
  );
}
