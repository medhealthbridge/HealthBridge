import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { BillingPage } from "@/src/components/clinic/billing-page";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";

export const metadata: Metadata = { title: "Billing" };

export default async function Page({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ view?: string }> }) {
  const { role } = await params;
  const { clinic } = await requireClinicRole("owner", "assistant");
  return <BillingPage clinic={clinic} basePath={`${roleHome(role)}/billing`} view={(await searchParams).view} />;
}
