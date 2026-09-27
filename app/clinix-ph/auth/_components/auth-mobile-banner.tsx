import { AUTH_SIDE_PANEL_COPY, type AuthMode } from "../_data";

type AuthMobileBannerProps = { mode: AuthMode; onToggle: () => void };

/**
 * Below md the brand panel is hidden, which on a phone left the card with no
 * Clinix PH mark and no way to reach the other mode except the small text
 * link. This carries the panel's job — wordmark, invite, and the CTA that
 * flips modes — in a strip across the top of the card.
 */
export function AuthMobileBanner({ mode, onToggle }: AuthMobileBannerProps) {
  const copy = AUTH_SIDE_PANEL_COPY[mode];

  return (
    <div className="flex flex-col gap-2 bg-linear-160 from-brand to-brand-700 px-5 py-4 text-white md:hidden">
      <span className="font-display text-base font-extrabold">Clinix PH</span>
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/90">{copy.headline}</p>
        <button
          type="button"
          onClick={onToggle}
          className="min-h-11 shrink-0 cursor-pointer rounded-[9px] border border-white/40 bg-white/15 px-3 text-[12.5px] font-semibold transition-colors duration-150 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copy.cta}
        </button>
      </div>
    </div>
  );
}
