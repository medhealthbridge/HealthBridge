import type { Metadata } from "next";
import { requireClinicRole } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppRecallsView from "@/src/server/views/app-recalls";

export const metadata: Metadata = { title: "Recalls" };

// Content lives in src/server/views/app-recalls.tsx and is cached on the client by TanStack Query.
export default function Page() {
  return <CachedPage bundle={AppRecallsView} view="app/recalls" title={"Recalls"} gate={() => requireClinicRole("owner", "assistant", "practitioner")} />;
}
