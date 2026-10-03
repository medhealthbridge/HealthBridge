import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { user } from "@/src/server/db/schema";
import { findOpenPatientInvite } from "@/src/server/services/patient-portal";
import { PatientJoinForm } from "./_components/patient-join-form";

export const metadata: Metadata = { title: "Your records · Clinix PH", robots: { index: false } };

export default async function PatientJoinPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token: raw } = await searchParams;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const invite = token.length >= 20 && token.length <= 200 ? await findOpenPatientInvite(token) : null;
  const [existing] = invite ? await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email)).limit(1) : [];

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 font-text text-slate-900 sm:p-6">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <h1 className="font-display text-xl font-extrabold tracking-tight">{invite ? `Your records at ${invite.clinicName}` : "Your records"}</h1>
        {invite ? (
          <>
            <p className="text-sm text-slate-700">You can see your appointments and receipts here. It&rsquo;s view-only; the clinic makes any changes. ({invite.email})</p>
            <PatientJoinForm token={token} hasAccount={Boolean(existing)} />
          </>
        ) : (
          <p role="alert" className="text-sm text-slate-700">This link is no longer valid. It may have expired or already been used. Ask the clinic to send a new one.</p>
        )}
      </div>
    </main>
  );
}
