import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { RecallsPage } from "@/src/components/clinic/recalls-page";

export const metadata: Metadata = { title: "Recalls" };

export default async function Page() {
  const { clinic } = await requireActiveClinicOwner();
  return <RecallsPage clinic={clinic} />;
}
