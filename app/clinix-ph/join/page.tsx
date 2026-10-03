import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { user } from "@/src/server/db/schema";
import { findOpenStaffInvite } from "@/src/server/services/clinic-staff";
import { JoinForm } from "./_components/join-form";

export const metadata: Metadata = { title: "Join the clinic · Clinix PH", robots: { index: false } };

const ROLE_LABEL = { assistant: "front-desk assistant", practitioner: "practitioner", owner: "owner" } as const;

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token: raw } = await searchParams;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const invite = token.length >= 20 && token.length <= 200 ? await findOpenStaffInvite(token) : null;
  const [existing] = invite ? await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1) : [];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 font-text text-slate-900 sm:p-6">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h1 className="font-display text-xl font-extrabold tracking-tight">{invite ? `Join ${invite.clinicName}` : "Join a clinic"}</h1>
        {invite ? (
          <>
            <p className="text-sm text-slate-700">
              You&rsquo;re invited as a <span className="font-semibold">{ROLE_LABEL[invite.role]}</span> ({invite.email}).
            </p>
            <JoinForm token={token} hasAccount={Boolean(existing)} />
          </>
        ) : (
          <p role="alert" className="text-sm text-slate-700">
            This invitation is no longer valid. It may have expired or already been used — ask the clinic to send a new one.
          </p>
        )}
      </div>
    </main>
  );
}
