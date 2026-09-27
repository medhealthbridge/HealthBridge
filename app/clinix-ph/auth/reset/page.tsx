import type { Metadata } from "next";
import { AuthPanelCard } from "./_components/auth-panel-card";
import { RequestResetForm } from "./_components/request-reset-form";

export const metadata: Metadata = {
  title: "Reset your password — Clinix PH",
  description: "Send yourself a link to set a new Clinix PH password.",
  robots: { index: false },
};

export default function ResetRequestPage() {
  return (
    <AuthPanelCard>
      <RequestResetForm />
    </AuthPanelCard>
  );
}
