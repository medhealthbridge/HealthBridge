# Page caching (TanStack Query)

The busiest console pages open instantly when you come back to them: their content is cached in memory by
TanStack Query and refreshed quietly in the background.

## How it works

- `src/components/query/query-provider.tsx`: one `QueryClient` per console (owner console and clinic app), memory
  only. Nothing is written to disk (the PWA rule: patient data never stays on the device); the cache disappears on
  sign-out or when the tab closes. Defaults: `staleTime` 30 s, `gcTime` 30 min, refetch on window focus.
- Each cached page's `page.tsx` is a thin shell (`CachedPage`): it checks access on the server (wrong role → real
  404) and renders `CachedView`.
- `CachedView` asks TanStack Query for `["view", user:clinic:role, viewName, params, searchParams]`. On a miss it
  shows the page's title with a skeleton and calls the server function `renderView`, which runs the page's own code
  in `src/server/views/<name>.tsx`. Every call re-runs that code's permission and clinic checks, so the cache only
  remembers what this person already saw.
- After a save, the Server Action's `revalidatePath` re-renders the page on the server; `CachedPage` sends a new
  `stamp`, and `CachedView` marks everything this person has cached as stale, so it all refreshes.
- Searching or filtering on the same page keeps the old list on screen until the new one arrives.

## Adding a page

1. Move the page body to `src/server/views/<area>-<name>.tsx` unchanged (default export, same props) and keep its
   own `require…` guard.
2. Add the name to `src/server/views/names.ts` and the import to `registry.ts`.
3. Make `page.tsx` render `<CachedPage bundle={TheView} view="…" title="…" gate={…} params searchParams />`.
   **`bundle` is required:** it makes Next.js ship the view's client components and server actions with the page.
   Without it, dialogs and buttons inside the cached content fail to load.
4. Don't add a `loading.tsx` for that route: it would flash the skeleton even when the cache has the page.

Pages not converted (patient chart, receipt, settings, forms) keep their server-rendered loaders.
