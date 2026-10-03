import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/src/server/auth";
import { platformRoleOf } from "@/src/server/services/access";
import { listTenants } from "@/src/server/services/tenants";
import { TenantsDirectory } from "./_components/tenants-directory";

export const metadata: Metadata = { title: "Tenants" };

export default async function TenantsPage() {
  const admin = await requirePlatformAdmin();
  const canManage = (await platformRoleOf(admin.id)) === "super_admin";

  return <TenantsDirectory tenants={await listTenants()} canManage={canManage} />;
}
