import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { listTenants } from "@/src/server/services/tenants";
import { TenantsDirectory } from "./_components/tenants-directory";

export const metadata: Metadata = { title: "Tenants" };

export default async function TenantsPage() {
  await requirePlatformAdmin();

  return <TenantsDirectory tenants={await listTenants()} />;
}
