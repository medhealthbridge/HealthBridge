// Content of app/clinix-ph/app/[role]/billing/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireClinicRole } from "@/src/server/auth";
import { BillingPage } from "@/src/components/clinic/billing-page";
import { roleHome, type AppRole } from "@/src/lib/clinic-app-nav";


export default async function PageView({ params, searchParams }: { params: Promise<{ role: AppRole }>; searchParams: Promise<{ view?: string }> }) {
  const { role } = await params;
  const { clinic } = await requireClinicRole("owner", "assistant");
  return <BillingPage clinic={clinic} basePath={`${roleHome(role)}/billing`} view={(await searchParams).view} />;
}
