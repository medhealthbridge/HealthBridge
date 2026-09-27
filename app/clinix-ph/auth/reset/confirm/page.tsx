import type { Metadata } from "next";
import Link from "next/link";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { AuthPanelCard } from "../_components/auth-panel-card";
import { NewPasswordForm } from "./_new-password-form";

export const metadata: Metadata = {
  title: "Set a new password — Clinix PH",
  robots: { index: false },
};

/**
 * Where better-auth's /reset-password/:token redirects once it has checked the
 * token — so an expired link lands here as `?error=`, never on a live form.
 */
export default async function ResetConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (error || !token) {
    return (
      <AuthPanelCard>
        <header>
          <h1 className="mb-1 font-display text-[23px] font-extrabold">This link has expired</h1>
          <p className="text-[13px] text-slate-600">
            Reset links last one hour and work once. Request a fresh one and we&rsquo;ll send another.
          </p>
        </header>
        <Link
          href={CLINIX_ROUTES.resetRequest}
          className="text-center text-[13px] font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Send a new reset link
        </Link>
      </AuthPanelCard>
    );
  }

  return (
    <AuthPanelCard showBackLink={false}>
      <NewPasswordForm token={token} />
    </AuthPanelCard>
  );
}
