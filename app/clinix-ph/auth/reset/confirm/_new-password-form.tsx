"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/src/server/actions/auth";
import { Button, buttonClassName } from "@/src/components/button";
import { TextField } from "@/src/components/form-controls";
import { CLINIX_ROUTES } from "@/src/lib/constants";

export function NewPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {} as ResetPasswordState);

  if (state.done) {
    return (
      <div className="flex flex-col items-center gap-2.5 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-brand/10 text-brand-700">
          <Check aria-hidden="true" className="size-5" />
        </span>
        <h1 className="font-display text-[21px] font-extrabold">Password updated</h1>
        <p className="text-[13px] text-slate-600">You can now log in with your new password.</p>
        <Link href={CLINIX_ROUTES.auth} className={buttonClassName("primary", "mt-1.5 w-full")}>
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <header>
        <h1 className="mb-1 font-display text-[23px] font-extrabold">Set a new password</h1>
        <p className="text-[13px] text-slate-600">Choose a strong password for your account.</p>
      </header>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <TextField
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          minLength={8}
          required
          error={state.fieldErrors?.password?.[0]}
        />
        {state.message && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </>
  );
}
