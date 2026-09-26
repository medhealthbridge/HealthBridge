import type { Metadata } from "next";
import { PageHeader } from "@/src/components/console/page-header";
import { FeedbackForm } from "./_components/feedback-form";

export const metadata: Metadata = { title: "Send feedback" };

export default function SendFeedbackPage() {
  return (
    <>
      <PageHeader title="Send feedback" description="Report a bug, request a feature, or tell us what’s not working." />
      <FeedbackForm />
    </>
  );
}
