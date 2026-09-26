import type { Metadata } from "next";
import { TENANTS } from "@/src/lib/mock-data/company-admin";
import { TenantsDirectory } from "./_components/tenants-directory";

export const metadata: Metadata = { title: "Tenants" };

export default function TenantsPage() {
  return <TenantsDirectory tenants={TENANTS} />;
}
