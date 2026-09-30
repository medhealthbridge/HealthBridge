import { redirect } from "next/navigation";
import { requireActiveClinic } from "@/src/server/auth";
import { roleHome } from "@/src/lib/clinic-app-nav";
import { CLINIX_ROUTES } from "@/src/lib/constants";

/** Post-login router: each role lands on its own route. Owners land in the console. */
export default async function ClinicAppIndex() {
  const { clinic } = await requireActiveClinic();
  redirect(clinic.role === "owner" ? CLINIX_ROUTES.admin : roleHome(clinic.role));
}
