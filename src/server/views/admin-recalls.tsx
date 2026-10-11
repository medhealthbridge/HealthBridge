// Content of app/clinix-ph/admin/recalls/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireActiveClinicOwner } from "@/src/server/auth";
import { RecallsPage } from "@/src/components/clinic/recalls-page";


export default async function PageView() {
  const { clinic } = await requireActiveClinicOwner();
  return <RecallsPage clinic={clinic} />;
}
