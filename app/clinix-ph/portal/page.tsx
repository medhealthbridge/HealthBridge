import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/src/components/sign-out-button";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { requireUser } from "@/src/server/auth";
import { formatPesoExact } from "@/src/lib/utils";
import { getPortalRecords, type PortalVisit } from "@/src/server/services/patient-portal";

export const metadata: Metadata = { title: "My records · Clinix PH", robots: { index: false } };

const STATUS: Record<string, string> = { requested: "Requested", confirmed: "Booked", checked_in: "Waiting", in_progress: "In chair", completed: "Done" };

function Visits({ rows, timezone, empty }: { rows: PortalVisit[]; timezone: string; empty: string }) {
  const when = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  if (rows.length === 0) return <p className="text-sm text-slate-600">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span><span className="block font-semibold">{row.serviceName ?? "Visit"}</span><span className="text-slate-600">{when.format(row.startsAt)}</span></span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">{STATUS[row.status] ?? row.status}</span>
        </li>
      ))}
    </ul>
  );
}

/** Read-only: the patient sees their own appointments and receipts. Nothing here writes. */
export default async function PortalPage() {
  const user = await requireUser();
  const records = await getPortalRecords(user.id);
  if (records.length === 0) redirect(CLINIX_ROUTES.app);

  return (
    <main className="min-h-dvh bg-slate-50 p-4 font-text text-slate-900 sm:p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-extrabold tracking-tight">My records</h1>
          <SignOutButton className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-700 underline">Log out</SignOutButton>
        </header>
        <p className="text-sm text-slate-600">This page is view-only. To change an appointment or your details, contact the clinic.</p>
        {records.map((record) => (
          <section key={`${record.clinicName}-${record.mrn}`} className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5" aria-label={record.clinicName}>
            <div>
              <h2 className="font-display text-lg font-extrabold">{record.clinicName}</h2>
              <p className="text-sm text-slate-600">{record.patientName} · {record.mrn}</p>
            </div>
            <div><h3 className="mb-1 text-sm font-bold">Upcoming</h3><Visits rows={record.upcoming} timezone={record.timezone} empty="No upcoming appointments." /></div>
            <div><h3 className="mb-1 text-sm font-bold">Past visits</h3><Visits rows={record.past} timezone={record.timezone} empty="No completed visits yet." /></div>
            <div>
              <h3 className="mb-1 text-sm font-bold">Receipts</h3>
              {record.receipts.length === 0 ? <p className="text-sm text-slate-600">No receipts yet.</p> : (
                <ul className="divide-y divide-slate-200">
                  {record.receipts.map((receipt) => (
                    <li key={receipt.invoiceNumber} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span><span className="block font-semibold">{receipt.invoiceNumber}</span><span className="text-slate-600">{receipt.issuedAt ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: record.timezone }).format(receipt.issuedAt) : ""}</span></span>
                      <span className={receipt.status === "void" ? "text-slate-500 line-through" : "font-semibold"}>{formatPesoExact(receipt.totalCents / 100)}{receipt.status === "void" ? " (void)" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
