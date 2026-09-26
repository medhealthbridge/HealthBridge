import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enabledSocialProviders, getSession } from "@/src/server/auth";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { AuthCard } from "./_components/auth-card";

export const metadata: Metadata = {
  title: "Log in or sign up — Clinix PH",
  description: "Log in to your Clinix PH clinic workspace, or start a 15-day free trial.",
};

export default async function ClinixAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (await getSession()) redirect(CLINIX_ROUTES.landing);
  const { mode } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 font-text text-slate-900 sm:p-6">
      <AuthCard
        initialMode={mode === "signup" ? "signup" : "login"}
        socialProviders={enabledSocialProviders}
      />
    </main>
  );
}
