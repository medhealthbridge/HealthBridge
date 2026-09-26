import { IMPORT_CARDS, IMPORT_KINDS } from "@/src/lib/mock-data/clinix-admin";
import { ImportButton } from "../../_components/import-button";
import { TransferCard } from "./transfer-card";

export function ImportCards() {
  return (
    <section aria-label="Import" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {IMPORT_CARDS.map((kind) => (
        <TransferCard
          key={kind}
          kicker="Import"
          title={IMPORT_KINDS[kind].label}
          desc={IMPORT_KINDS[kind].desc}
          action={<ImportButton kind={kind} label="Import file" variant="primary" />}
        />
      ))}
    </section>
  );
}
