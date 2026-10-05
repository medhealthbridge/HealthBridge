import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { RecallsPage } from "@/src/components/clinic/recalls-page";

export const metadata: Metadata = { title: "Recalls" };

export default async function Page() {
  const { clinic } = await requireClinicRole("owner", "assistant", "practitioner");
  return <RecallsPage clinic={clinic} />;
}
