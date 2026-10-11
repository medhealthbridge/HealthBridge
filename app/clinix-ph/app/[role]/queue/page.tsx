import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppQueueView from "@/src/server/views/app-queue";

export const metadata: Metadata = { title: "Queue" };

// Content lives in src/server/views/app-queue.tsx and is cached on the client by TanStack Query.
export default function Page({ params }: { params: Promise<Record<string, string>> }) {
  return <CachedPage bundle={AppQueueView} view="app/queue" title={"Queue"} gate={() => requireClinicRole("owner", "assistant")} params={params} />;
}
