"use client";

import { useActionState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { adminLoginAction, type AdminLoginState } from "@/src/server/actions/platform-staff";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, {} as AdminLoginState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormField id="admin-email" label="Email" error={errors.email?.[0]}>
        <input id="admin-email" name="email" type="email" autoComplete="username" required defaultValue={state.values?.email ?? ""} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "admin-email-error" : undefined} className={CONSOLE_INPUT} />
      </FormField>
      <FormField id="admin-password" label="Password" error={errors.password?.[0]}>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? "admin-password-error" : undefined} className={CONSOLE_INPUT} />
      </FormField>
      {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
      <ConsoleButton type="submit" variant="primary" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </ConsoleButton>
    </form>
  );
}
