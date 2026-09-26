import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { PageHeader } from "@/src/components/console/page-header";
import { TENANT_FEEDBACK } from "@/src/lib/mock-data/company-admin";
import { FeedbackList } from "./_components/feedback-list";

export const metadata: Metadata = { title: "Feedbacks" };

export default async function FeedbackPage() {
  await requirePlatformAdmin();

  const newCount = TENANT_FEEDBACK.filter((item) => item.status === "New").length;

  return (
    <>
      <PageHeader title="Feedbacks" description={`Across all tenants · ${newCount} new`} />
      <FeedbackList />
    </>
  );
}
