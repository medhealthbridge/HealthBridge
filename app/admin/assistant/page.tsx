import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { aiLayerConfigured } from "@/src/server/agent/admin-assistant";
import { usageToday } from "@/src/server/services/agent-usage";
import { platformRoleOf } from "@/src/server/services/access";
import { PageHeader } from "@/src/components/console/page-header";
import { AssistantChat } from "./_components/assistant-chat";

export const metadata: Metadata = { title: "Assistant" };

const SUGGESTIONS = [
  "How is the business doing this month?",
  "Which trials end this week?",
  "Any tenants past due?",
  "Are there domain orders that need review?",
];

export default async function AssistantPage() {
  const admin = await requirePlatformAdmin();
  const [usage, role] = await Promise.all([usageToday(admin.id), platformRoleOf(admin.id)]);

  return (
    <>
      <PageHeader title="Assistant" description={role === "super_admin" ? "Ask about tenants, revenue, your team and domain orders. Changes it prepares only happen after you confirm." : "Ask about tenants, revenue, your team and domain orders. It reads live data."} />
      <AssistantChat suggestions={SUGGESTIONS} aiConfigured={aiLayerConfigured()} usage={usage} />
    </>
  );
}
