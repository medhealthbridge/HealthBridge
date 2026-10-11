"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConsoleButton } from "@/src/components/console/console-button";
import { Panel } from "@/src/components/console/panel";
import { PageSkeleton } from "@/src/components/console/page-skeleton";
import { renderView } from "@/src/server/views/render";
import type { ViewName } from "@/src/server/views/names";

type Props = {
  view: ViewName;
  params: Record<string, string>;
  searchParams: Record<string, string>;
  /** Who and where: the user, clinic and role. Part of every key, so one person's cache never serves another's. */
  scope: string;
  /** Shown while a page is loaded for the first time. */
  title: string;
  /** Changes when the server re-renders this page after a save (revalidatePath), never on plain navigation. */
  stamp: number;
};

/**
 * A page's content, cached by TanStack Query. A page you have seen opens instantly from memory and is refreshed
 * quietly in the background once it is older than the cache's staleTime (30 s). After any save, everything this
 * person has cached is marked stale, so the next look is fresh.
 */
export function CachedView({ view, params, searchParams, scope, title, stamp }: Props) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["view", scope, view, params, searchParams],
    queryFn: () => renderView(view, params, searchParams),
    // A new search or filter on the same page keeps the current list on screen until the new one arrives.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === view ? previous : undefined),
  });

  const seen = useRef(stamp);
  useEffect(() => {
    if (seen.current === stamp) return;
    seen.current = stamp;
    void queryClient.invalidateQueries({ queryKey: ["view", scope] });
  }, [stamp, scope, queryClient]);

  if (query.isPending) return <PageSkeleton title={title} />;
  if (query.isError && !query.data) {
    return (
      <Panel className="flex flex-col items-start gap-3 p-4 text-[13px]">
        <p className="font-semibold">This page couldn&rsquo;t load.</p>
        <p className="text-console-muted">Check your connection and try again.</p>
        <ConsoleButton onClick={() => void query.refetch()}>Try again</ConsoleButton>
      </Panel>
    );
  }
  return <>{query.data}</>;
}
