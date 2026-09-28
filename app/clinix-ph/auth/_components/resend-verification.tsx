"use client";

import { useActionState, useEffect, useState } from "react";
import { resendVerificationAction, type ResendVerificationState } from "@/src/server/actions/auth";
import { VERIFICATION_RESEND_COOLDOWN_SECONDS } from "@/src/lib/constants";

/**
 * "Didn't get it?" link for a verification email that was just sent — by
 * sign-up, or by a login attempt on an unverified account. Starts on cooldown
 * because an email went out moments before this rendered.
 */
export function ResendVerification({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resendVerificationAction, {} as ResendVerificationState);

  return (
    <form action={formAction} className="flex flex-col gap-1 text-center text-sm text-slate-600">
      <input type="hidden" name="email" value={email} />
      <p>
        Didn&rsquo;t get it? Check spam, or{" "}
        {/* Keyed on the last send so each one remounts with a fresh countdown. */}
        <ResendButton key={state.sentAt ?? 0} pending={pending} />
      </p>
      <p aria-live="polite" className={state.message ? "text-red-700" : ""}>
        {state.message ?? (state.sentAt ? "Sent — check your inbox." : null)}
      </p>
    </form>
  );
}

function ResendButton({ pending }: { pending: boolean }) {
  const [secondsLeft, setSecondsLeft] = useState(VERIFICATION_RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const coolingDown = secondsLeft > 0;

  return (
    <button
      type="submit"
      disabled={pending || coolingDown}
      className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-600 disabled:no-underline"
    >
      {pending ? "Sending…" : coolingDown ? `resend in ${secondsLeft}s` : "resend the link"}
    </button>
  );
}
