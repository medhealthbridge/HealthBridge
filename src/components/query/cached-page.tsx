import { CachedView } from "./cached-view";
import type { ViewName } from "@/src/server/views/names";

/** When this server render happened. A new value reaches the client only when the server re-renders the page. */
const renderedAt = () => Date.now();

type Gate = () => Promise<{ user: { id: string }; clinic: { id: string; role: string } }>;
type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The page shell for a cached page. It checks access here, on the server, so a wrong role still gets a real 404,
 * then hands the content to the client cache. Kept cheap on purpose: no data is read here.
 */
export async function CachedPage({ view, title, gate, params, searchParams, bundle }: {
  view: ViewName;
  /**
   * The view's own module, passed (not rendered) so Next.js bundles its client components and server actions
   * with this page. Content rendered by a server action is only usable if those are in the page's manifests.
   */
  bundle: unknown;
  title: string | ((role: string) => string);
  gate: Gate;
  params?: Promise<Record<string, string>>;
  searchParams?: Promise<SearchParams>;
}) {
  void bundle;
  const { user, clinic } = await gate();
  const stamp = renderedAt();
  const routeParams = params ? await params : {};
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries((searchParams ? await searchParams : {}) ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") query[key] = first;
  }
  return (
    <CachedView
      view={view}
      params={routeParams}
      searchParams={query}
      scope={`${user.id}:${clinic.id}:${clinic.role}`}
      title={typeof title === "function" ? title(clinic.role) : title}
      stamp={stamp}
    />
  );
}
