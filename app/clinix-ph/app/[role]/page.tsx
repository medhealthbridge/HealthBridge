import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppTodayView from "@/src/server/views/app-today";

export const metadata: Metadata = { title: "Today" };

// Content lives in src/server/views/app-today.tsx and is cached on the client by TanStack Query.
export default function Page({ params }: { params: Promise<Record<string, string>> }) {
  return <CachedPage bundle={AppTodayView} view="app/today" title={(role) => (role === "practitioner" ? "My schedule" : "Today")} gate={requireActiveClinic} params={params} />;
}
