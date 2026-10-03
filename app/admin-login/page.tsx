import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/src/server/auth";
import { platformRoleOf } from "@/src/server/services/access";
import { COMPANY_ADMIN_ROUTE, CLINIX_ROUTES } from "@/src/lib/constants";
import { AdminLoginForm } from "./_components/admin-login-form";

export const metadata: Metadata = { title: "Sign in · DataBridgeSol admin", robots: { index: false } };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.user.emailVerified && (await platformRoleOf(session.user.id))) redirect(COMPANY_ADMIN_ROUTE);

  return (
    // The company console is dark by default; this page matches it rather than Clinix's light sign-in.
    <main className="dark flex min-h-dvh items-center justify-center bg-console-canvas p-4 font-text text-console-ink">
      <div className="flex w-full max-w-[380px] flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-console-accent font-display text-base font-extrabold text-console-on-accent">D</span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-extrabold">DataBridgeSol</span>
            <span className="text-[10px] tracking-widest text-console-subtle uppercase">Company admin</span>
          </div>
        </div>
        <div className="flex flex-col gap-5 rounded-xl border border-console-line bg-console-panel p-5 sm:p-6">
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">Sign in</h1>
            <p className="text-[13px] text-console-muted">Team access only. Invited by email? Use your invitation link instead.</p>
          </div>
          <AdminLoginForm />
        </div>
        <p className="text-center text-[11px] text-console-subtle">
          <Link href={`${CLINIX_ROUTES.auth}/reset`} className="cursor-pointer underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-console-accent">
            Forgot your password?
          </Link>
        </p>
      </div>
    </main>
  );
}
