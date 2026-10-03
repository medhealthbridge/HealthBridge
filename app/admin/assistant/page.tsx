import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { adminAssistantConfigured } from "@/src/server/agent/admin-assistant";
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
  await requirePlatformAdmin();

  return (
    <>
      <PageHeader title="Assistant" description="Ask about tenants, revenue, your team and domain orders. It reads live data and can't change anything." />
      <AssistantChat suggestions={SUGGESTIONS} configured={adminAssistantConfigured()} />
    </>
  );
}
