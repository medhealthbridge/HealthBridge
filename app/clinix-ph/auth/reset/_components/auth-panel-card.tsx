import Link from "next/link";
import { CLINIX_ROUTES } from "@/src/lib/constants";

/** The design's small centred card, shared by both steps of the reset flow. */
export function AuthPanelCard({ children, showBackLink = true }: { children: React.ReactNode; showBackLink?: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 font-text text-slate-900">
      <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl bg-white p-8 shadow-sm">
        {children}
        {showBackLink ? (
          <Link
            href={CLINIX_ROUTES.auth}
            className="text-center text-[13px] font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            ← Back to login
          </Link>
        ) : null}
      </div>
    </main>
  );
}
