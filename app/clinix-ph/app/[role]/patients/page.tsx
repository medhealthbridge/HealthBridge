import type { Metadata } from "next";
import { requireActiveClinic } from "@/src/server/auth";
import { CachedPage } from "@/src/components/query/cached-page";
import AppPatientsView from "@/src/server/views/app-patients";

export const metadata: Metadata = { title: "Patients" };

// Content lives in src/server/views/app-patients.tsx and is cached on the client by TanStack Query.
export default function Page({ params, searchParams }: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CachedPage bundle={AppPatientsView} view="app/patients" title={"Patients"} gate={requireActiveClinic} params={params} searchParams={searchParams} />;
}
