import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
  if (await getSession()) redirect(CLINIX_ROUTES.admin);
  const { mode } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-4 font-text text-slate-900 sm:p-6">
      <div className="w-full max-w-[440px] md:max-w-[960px]">
        <Link
          href={CLINIX_ROUTES.landing}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Clinix PH
        </Link>
      </div>
      <AuthCard
        initialMode={mode === "signup" ? "signup" : "login"}
        socialProviders={enabledSocialProviders}
      />
    </main>
  );
}
