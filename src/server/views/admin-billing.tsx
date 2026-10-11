// Content of app/clinix-ph/admin/billing/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { BillingPage } from "@/src/components/clinic/billing-page";
import { CLINIX_ROUTES } from "@/src/lib/constants";


export default async function PageView({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { clinic } = await requireActiveClinicOwner();
  return <BillingPage clinic={clinic} basePath={`${CLINIX_ROUTES.admin}/billing`} view={(await searchParams).view} />;
}
