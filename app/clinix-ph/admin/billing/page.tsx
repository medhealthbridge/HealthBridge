import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { BillingPage } from "@/src/components/clinic/billing-page";
import { CLINIX_ROUTES } from "@/src/lib/constants";

export const metadata: Metadata = { title: "Billing" };

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  return <BillingPage clinic={clinic} basePath={`${CLINIX_ROUTES.admin}/billing`} view={(await searchParams).view} />;
}
