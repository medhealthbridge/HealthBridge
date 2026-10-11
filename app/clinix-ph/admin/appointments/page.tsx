import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminAppointmentsView from "@/src/server/views/admin-appointments";

export const metadata: Metadata = { title: "Appointments & queue" };

// Content lives in src/server/views/admin-appointments.tsx and is cached on the client by TanStack Query.
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AdminAppointmentsView} view="admin/appointments" title={"Appointments & queue"} gate={requireActiveClinicOwner} searchParams={searchParams} />;
}
