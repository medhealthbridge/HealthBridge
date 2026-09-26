import { AUTH_SIDE_PANEL_COPY, type AuthMode } from "../_data";

type AuthSidePanelProps = { mode: AuthMode; onToggle: () => void };

export function AuthSidePanel({ mode, onToggle }: AuthSidePanelProps) {
  const copy = AUTH_SIDE_PANEL_COPY[mode];

  return (
    <aside
      className={`absolute inset-y-0 left-0 z-10 hidden w-[42%] flex-col justify-between bg-linear-160 from-brand to-brand-700 p-11 text-white transition-transform duration-300 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none md:flex ${
        mode === "login" ? "translate-x-[138.1%]" : "translate-x-0"
      }`}
    >
      <div className="flex flex-col gap-3.5">
        <span className="font-display text-xl font-extrabold">Clinix PH</span>
        <h2 className="font-display text-[26px] leading-tight font-extrabold">{copy.headline}</h2>
        <p className="max-w-[280px] text-sm leading-relaxed text-white/90">{copy.body}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="min-h-11 cursor-pointer self-start rounded-[9px] border border-white/40 bg-white/15 px-4.5 text-sm font-semibold transition-colors duration-150 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {copy.cta}
      </button>
    </aside>
  );
}
