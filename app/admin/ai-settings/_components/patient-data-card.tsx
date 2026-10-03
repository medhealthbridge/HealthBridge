import { ConsoleButton } from "@/src/components/console/console-button";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { setPatientDataAiAction } from "@/src/server/actions/ai-settings";

/** The one switch that lets tenants' AI assistants touch patient records at all. */
export function PatientDataCard({ allowed }: { allowed: boolean }) {
  return (
    <Panel>
      <PanelHeader title="Patient data in tenant assistants">
        <Pill tone={allowed ? "accent" : "neutral"}>{allowed ? "Allowed" : "Off"}</Pill>
      </PanelHeader>
      <div className="flex flex-col gap-3 px-3.5 py-3">
        <p className="text-xs text-console-muted">
          A tenant&rsquo;s assistant reads and edits that clinic&rsquo;s patients and appointments, so the names and records it handles are sent to your AI
          provider. Turn this on only when your keys are on a paid plan that doesn&rsquo;t use prompts for training. While it is off, no tenant can use the
          assistant even if you have granted it.
        </p>
        <form action={setPatientDataAiAction}>
          <input type="hidden" name="allow" value={allowed ? "false" : "true"} />
          <ConsoleButton type="submit" variant={allowed ? "danger" : "primary"} size="sm">
            {allowed ? "Turn off" : "I confirm — allow patient data"}
          </ConsoleButton>
        </form>
      </div>
    </Panel>
  );
}
