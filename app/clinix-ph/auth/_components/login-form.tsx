"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/src/server/actions/auth";
import { Button } from "@/src/components/button";
import { TextField } from "@/src/components/form-controls";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import type { SocialProvider } from "@/src/lib/constants";
import { AUTH_ROLE_COPY, type AuthRole } from "../_data";
import { RoleLinks } from "./role-links";
import { SocialSignIn } from "./social-sign-in";
import { SwitchModePrompt } from "./switch-mode-prompt";

type LoginFormProps = {
  socialProviders: readonly SocialProvider[];
  role: AuthRole;
  onSwitch: () => void;
};

export function LoginForm({ socialProviders, role, onSwitch }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, {} as LoginState);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="mb-1 font-display text-[26px] font-extrabold">Welcome back</h1>
        <p className="text-sm text-slate-600">{AUTH_ROLE_COPY[role].loginCopy}</p>
      </header>

      <SocialSignIn providers={socialProviders} intent="login" />

      <form action={formAction} className="flex flex-col gap-3">
        <TextField
          name="email"
          type="email"
          label="Email"
          hideLabel
          placeholder="Email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email?.[0]}
        />
        <TextField
          name="password"
          type="password"
          label="Password"
          hideLabel
          placeholder="Password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password?.[0]}
        />
        <Link
          href={CLINIX_ROUTES.resetRequest}
          className="self-end text-xs font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Forgot password?
        </Link>
        {state.message && (
          <p role="alert" className="text-sm text-red-700">
            {state.message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <SwitchModePrompt prompt="No account?" action="Sign up" onSwitch={onSwitch} />
      <RoleLinks role={role} />
    </div>
  );
}
