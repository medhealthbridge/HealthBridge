import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { ClaimsPage } from "@/src/components/clinic/claims-page";

export const metadata: Metadata = { title: "Claims & receivables" };

export default async function Page() {
  const { clinic } = await requireClinicRole("owner", "assistant");
  return <ClaimsPage clinic={clinic} />;
}
