/** Uppercase micro-label above a figure or a card's contents. */
export function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[9px] font-semibold tracking-[0.12em] text-slate-500 uppercase ${className}`}>
      {children}
    </span>
  );
}
