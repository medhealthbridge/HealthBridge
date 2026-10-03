import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { Panel } from "@/src/components/console/panel";
import { AssistantChat } from "@/src/components/assistant/assistant-chat";
import { aiLayerConfigured } from "@/src/server/agent/assistant";
import { CLINIC_FEATURE } from "@/src/server/agent/clinic-assistant";
import { clinicAiAccess } from "@/src/server/services/ai-access";
import { usageToday } from "@/src/server/services/agent-usage";

export const metadata: Metadata = { title: "Assistant" };

const SUGGESTIONS = ["How does today look?", "Appointments tomorrow", "Find Santos", "Add a new patient"];

const UNAVAILABLE = {
  role: "The assistant is for the clinic owner.",
  not_granted: "The AI assistant isn't switched on for your account. Ask DataBridgeSol to enable it.",
  patient_data_off: "The AI assistant isn't available yet. DataBridgeSol is still confirming how patient data is protected with its AI providers.",
} as const;

export default async function ClinicAssistantPage() {
  const { user, clinic } = await requireActiveClinic();
  const access = await clinicAiAccess(clinic);

  return (
    <>
      <PageHeader title="Assistant" description={`Ask about ${clinic.name}'s patients and appointments. Changes it prepares only happen after you confirm.`} />
      {access.allowed ? (
        <AssistantChat
          endpoint="/api/clinic/agent"
          confirmEndpoint="/api/clinic/agent/confirm"
          placeholder="Ask about patients or appointments…"
          suggestions={SUGGESTIONS}
          aiConfigured={await aiLayerConfigured()}
          usage={await usageToday(user.id, CLINIC_FEATURE)}
        />
      ) : (
        <Panel className="px-4 py-8 text-center text-[13px] text-console-muted">{UNAVAILABLE[access.reason]}</Panel>
      )}
    </>
  );
}
