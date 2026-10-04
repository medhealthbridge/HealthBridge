"use client";

import { useActionState } from "react";
import { Button } from "@/src/components/button";
import { PasswordInput } from "@/src/components/password-input";
import { acceptPatientInviteAction, type PatientJoinState } from "@/src/server/actions/patient-portal";

const INPUT = "min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand";

export function PatientJoinForm({ token, hasAccount }: { token: string; hasAccount: boolean }) {
  const [state, action, pending] = useActionState(acceptPatientInviteAction, {} as PatientJoinState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-slate-700">{hasAccount ? "Enter your existing password to accept." : "Create your account to accept."}</p>
      {!hasAccount && (
        <div className="flex flex-col gap-1">
          <label htmlFor="join-name" className="text-sm font-semibold">Full name</label>
          <input id="join-name" name="name" autoComplete="name" required className={INPUT} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "join-name-error" : undefined} />
          {errors.name && <p id="join-name-error" role="alert" className="text-xs text-red-700">{errors.name[0]}</p>}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="join-password" className="text-sm font-semibold">{hasAccount ? "Your password" : "Choose a password"}</label>
        <PasswordInput id="join-password" name="password" autoComplete={hasAccount ? "current-password" : "new-password"} required minLength={8} className={INPUT} aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? "join-password-error" : undefined} />
        {errors.password && <p id="join-password-error" role="alert" className="text-xs text-red-700">{errors.password[0]}</p>}
      </div>
      {state.message && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Setting up…" : "Open my records"}</Button>
    </form>
  );
}
