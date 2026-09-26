"use client";

import { useFormStatus } from "react-dom";
import { socialSignInAction } from "@/src/server/actions/auth";
import type { SocialProvider } from "@/src/lib/constants";
import { SOCIAL_PROVIDER_DISPLAY, type AuthMode } from "../_data";

type SocialSignInProps = { providers: readonly SocialProvider[]; intent: AuthMode };

/** Configured OAuth providers plus the "or" divider; renders nothing when none are set up. */
export function SocialSignIn({ providers, intent }: SocialSignInProps) {
  if (providers.length === 0) return null;
  const verb = intent === "login" ? "Continue" : "Sign up";

  return (
    <>
      <form action={socialSignInAction} className="flex flex-col gap-2">
        <input type="hidden" name="intent" value={intent} />
        {providers.map((provider) => (
          <SocialButton key={provider} provider={provider} verb={verb} />
        ))}
      </form>
      <div className="flex items-center gap-2.5 text-[11px] text-slate-600">
        <span className="h-px flex-1 bg-slate-200" />
        OR
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </>
  );
}

function SocialButton({ provider, verb }: { provider: SocialProvider; verb: string }) {
  const { pending } = useFormStatus();
  const { label, glyph } = SOCIAL_PROVIDER_DISPLAY[provider];

  return (
    <button
      type="submit"
      name="provider"
      value={provider}
      disabled={pending}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span aria-hidden="true" className="font-mono font-bold">
        {glyph}
      </span>
      {verb} with {label}
    </button>
  );
}
