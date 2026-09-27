"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type RequestResetState } from "@/src/server/actions/auth";
import { Button } from "@/src/components/button";
import { TextField } from "@/src/components/form-controls";

export function RequestResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, {} as RequestResetState);

  // Shown for any address, known or not — the action answers identically
  // either way, so this screen can't be used to probe for accounts.
  if (state.sent) {
    return (
      <>
        <header>
          <h1 className="mb-1 font-display text-[23px] font-extrabold">Check your inbox</h1>
          <p className="text-[13px] text-slate-600">
            If {state.values?.email} has an account, a reset link is on its way. The link expires in one hour.
          </p>
        </header>
        <p className="text-[13px] text-slate-600">
          Nothing after a few minutes? Check spam, then try again.
        </p>
      </>
    );
  }

  return (
    <>
      <header>
        <h1 className="mb-1 font-display text-[23px] font-extrabold">Forgot your password?</h1>
        <p className="text-[13px] text-slate-600">Enter your account email and we&rsquo;ll send a reset link.</p>
      </header>

      <form action={formAction} className="flex flex-col gap-3">
        <TextField
          name="email"
          type="email"
          label="Email"
          placeholder="you@clinic.ph"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email?.[0]}
        />
        {state.message && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </>
  );
}
