import type { Metadata } from "next";
import { requireSuperAdmin } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { secretStatuses } from "@/src/server/services/platform-secrets";
import { ProviderKeyCard } from "./_components/provider-key-card";

export const metadata: Metadata = { title: "AI settings" };

export default async function AiSettingsPage() {
  await requireSuperAdmin();
  const status = await secretStatuses();

  return (
    <>
      <PageHeader
        title="AI settings"
        description="The assistant answers common questions instantly for free, then asks Gemini, then Claude. Paste a key for each layer you want."
      />
      <ProviderKeyCard
        name="gemini_api_key"
        title="Gemini (first AI layer)"
        help="From Google AI Studio. Free keys may let Google use prompts to improve its products; the assistant hides email addresses before sending, but use a paid key for client data."
        status={status.gemini_api_key}
      />
      <ProviderKeyCard
        name="anthropic_api_key"
        title="Claude (second layer, optional)"
        help="From the Anthropic Console. Used only if Gemini is unavailable or has no key."
        status={status.anthropic_api_key}
      />
      <p className="text-xs text-console-muted">
        Keys are stored encrypted and only the last four characters are ever shown. Pasting a new key replaces the old one.
      </p>
    </>
  );
}
