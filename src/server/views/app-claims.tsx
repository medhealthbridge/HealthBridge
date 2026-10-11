// Content of app/clinix-ph/app/[role]/claims/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireClinicRole } from "@/src/server/auth";
import { ClaimsPage } from "@/src/components/clinic/claims-page";


export default async function PageView() {
  const { clinic } = await requireClinicRole("owner", "assistant");
  return <ClaimsPage clinic={clinic} />;
}
