import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppAppointmentsView from "@/src/server/views/app-appointments";

export const metadata: Metadata = { title: "Appointments" };

// Content lives in src/server/views/app-appointments.tsx and is cached on the client by TanStack Query.
export default function Page({ params, searchParams }: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AppAppointmentsView} view="app/appointments" title={(role) => (role === "practitioner" ? "My calendar" : "Appointments")} gate={requireActiveClinic} params={params} searchParams={searchParams} />;
}
