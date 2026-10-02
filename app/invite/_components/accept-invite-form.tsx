"use client";

import { useActionState } from "react";
import { Button } from "@/src/components/button";
import { acceptInviteAction, type AcceptInviteState } from "@/src/server/actions/platform-staff";

const INPUT =
  "min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand";

export function AcceptInviteForm({ token, email, hasAccount }: { token: string; email: string; hasAccount: boolean }) {
  const [state, action, pending] = useActionState(acceptInviteAction, {} as AcceptInviteState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-slate-700">
        {hasAccount ? "Sign in with your existing password to accept the invitation for " : "Create your account to accept the invitation for "}
        <span className="font-semibold text-slate-900">{email}</span>.
      </p>

      {!hasAccount && (
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-name" className="text-sm font-semibold">Full name</label>
          <input id="invite-name" name="name" autoComplete="name" required className={INPUT} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "invite-name-error" : undefined} />
          {errors.name && <p id="invite-name-error" role="alert" className="text-xs text-red-700">{errors.name[0]}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="invite-password" className="text-sm font-semibold">{hasAccount ? "Your password" : "Choose a password"}</label>
        <input
          id="invite-password"
          name="password"
          type="password"
          autoComplete={hasAccount ? "current-password" : "new-password"}
          required
          minLength={8}
          className={INPUT}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "invite-password-error" : undefined}
        />
        {errors.password && <p id="invite-password-error" role="alert" className="text-xs text-red-700">{errors.password[0]}</p>}
      </div>

      {state.message && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Joining…" : "Accept invitation"}</Button>
    </form>
  );
}
