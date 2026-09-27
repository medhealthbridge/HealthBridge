/** Transient confirmation pinned above the bottom nav. */
export function ToastBanner({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-4 bottom-[78px] z-60 rounded-lg bg-slate-900 px-3 py-2.5 text-[12.5px] text-slate-100 shadow-lg"
    >
      {message}
    </div>
  );
}
