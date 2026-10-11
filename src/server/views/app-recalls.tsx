// Content of app/clinix-ph/app/[role]/recalls/page.tsx, rendered for the client cache (src/server/views/render.ts). Moved here unchanged.
import { requireClinicRole } from "@/src/server/auth";
import { RecallsPage } from "@/src/components/clinic/recalls-page";


export default async function PageView() {
  const { clinic } = await requireClinicRole("owner", "assistant", "practitioner");
  return <RecallsPage clinic={clinic} />;
}
