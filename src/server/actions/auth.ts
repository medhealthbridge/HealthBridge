"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/src/server/auth";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import {
  loginSchema,
  signupSchema,
  socialSignInSchema,
  type LoginInput,
  type SignupInput,
} from "@/src/lib/schemas/auth";
import type { FormState } from "@/src/types/form-state";

export type LoginState = FormState<keyof LoginInput>;
export type SignupState = FormState<keyof SignupInput>;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (error) {
    if (error instanceof APIError) return { values, message: "Incorrect email or password." };
    throw error;
  }

  revalidatePath(CLINIX_ROUTES.landing, "layout");
  redirect(CLINIX_ROUTES.landing);
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.signUpEmail({ body: parsed.data });
  } catch (error) {
    if (error instanceof APIError) {
      return { values, message: error.body?.message ?? "We couldn't create your account. Try again." };
    }
    throw error;
  }

  revalidatePath(CLINIX_ROUTES.landing, "layout");
  redirect(CLINIX_ROUTES.onboarding);
}

export async function socialSignInAction(formData: FormData) {
  const { provider, intent } = socialSignInSchema.parse(Object.fromEntries(formData));

  const { url } = await auth.api.signInSocial({
    body: {
      provider,
      callbackURL: intent === "signup" ? CLINIX_ROUTES.onboarding : CLINIX_ROUTES.landing,
      newUserCallbackURL: CLINIX_ROUTES.onboarding,
    },
  });

  if (!url) throw new Error(`No redirect URL returned for ${provider} sign-in.`);
  redirect(url);
}
