"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/src/server/actions/auth";
import { Button } from "@/src/components/button";
import { TextField } from "@/src/components/form-controls";
import type { SocialProvider } from "@/src/lib/constants";
import { SocialSignIn } from "./social-sign-in";
import { SwitchModePrompt } from "./switch-mode-prompt";

type LoginFormProps = { socialProviders: readonly SocialProvider[]; onSwitch: () => void };

export function LoginForm({ socialProviders, onSwitch }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, {} as LoginState);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="mb-1 font-display text-[26px] font-extrabold">Welcome back</h1>
        <p className="text-sm text-slate-600">Log in to your clinic workspace.</p>
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
      <p className="text-center text-[11px] tracking-[.06em] text-slate-600 uppercase">Owner login</p>
    </div>
  );
}
