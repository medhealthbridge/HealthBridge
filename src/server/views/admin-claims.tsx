// Content of app/clinix-ph/admin/claims/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { ClaimsPage } from "@/src/components/clinic/claims-page";


export default async function PageView() {
  const { clinic } = await requireActiveClinicOwner();
  return <ClaimsPage clinic={clinic} />;
}
