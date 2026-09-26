import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { TENANTS } from "@/src/lib/mock-data/company-admin";
import { TenantsDirectory } from "./_components/tenants-directory";

export const metadata: Metadata = { title: "Tenants" };

export default async function TenantsPage() {
  await requirePlatformAdmin();

  return <TenantsDirectory tenants={TENANTS} />;
}
