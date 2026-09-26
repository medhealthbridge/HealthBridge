import { Kicker, Panel } from "@/src/components/console/panel";
import { CLINIC_VERTICAL } from "@/src/lib/mock-data/clinix-admin";

export function VerticalCard() {
  return (
    <Panel className="flex max-w-2xl flex-col gap-1.5 p-4">
      <Kicker>Vertical</Kicker>
      <span className="text-sm font-semibold">{CLINIC_VERTICAL}</span>
      <span className="text-xs text-console-muted">Set during onboarding. Changing it resets the custom field set below.</span>
    </Panel>
  );
}
