import type { Metadata } from "next";
import { requireActiveClinicOwner } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AdminRemindersView from "@/src/server/views/admin-reminders";

export const metadata: Metadata = { title: "Reminders & delivery" };

// Content lives in src/server/views/admin-reminders.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AdminRemindersView} view="admin/reminders" title={"Reminders & delivery"} gate={requireActiveClinicOwner} />;
}
