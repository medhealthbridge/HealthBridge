/** Shown the instant a link is clicked, while the next page's data loads, so navigation never feels stuck. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 motion-safe:animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-6 w-48 rounded-md bg-console-ink/10" />
        <div className="h-3.5 w-72 max-w-full rounded-md bg-console-ink/8" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <div key={index} className="h-20 rounded-xl border border-console-line bg-console-panel" />)}
      </div>
      <div className="h-72 rounded-xl border border-console-line bg-console-panel" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
