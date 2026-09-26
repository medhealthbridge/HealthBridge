"use client";

import { useActionState } from "react";
import { signupAction, type SignupState } from "@/src/server/actions/auth";
import { Button } from "@/src/components/button";
import { TextField } from "@/src/components/form-controls";
import { TRIAL_DAYS, type SocialProvider } from "@/src/lib/constants";
import { SocialSignIn } from "./social-sign-in";
import { SwitchModePrompt } from "./switch-mode-prompt";

type SignupFormProps = { socialProviders: readonly SocialProvider[]; onSwitch: () => void };

export function SignupForm({ socialProviders, onSwitch }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(signupAction, {} as SignupState);

  return (
    <div className="flex flex-col gap-3.5">
      <header>
        <h1 className="mb-1 font-display text-[26px] font-extrabold">Create your account</h1>
        <p className="text-sm text-slate-600">Start your {TRIAL_DAYS}-day free trial.</p>
      </header>

      <SocialSignIn providers={socialProviders} intent="signup" />

      <form action={formAction} className="flex flex-col gap-3">
        <TextField
          name="name"
          label="Full name"
          hideLabel
          placeholder="Full name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name?.[0]}
        />
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
          placeholder="Password (8+ characters)"
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
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <SwitchModePrompt prompt="Already have one?" action="Log in" onSwitch={onSwitch} />
    </div>
  );
}
