"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/src/server/auth";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import {
  loginSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  signupSchema,
  socialSignInSchema,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
} from "@/src/lib/schemas/auth";
import type { FormState } from "@/src/types/form-state";

export type LoginState = FormState<keyof LoginInput>;
export type RequestResetState = FormState<"email"> & { sent?: boolean };
export type ResetPasswordState = FormState<keyof ResetPasswordInput> & { done?: boolean };
export type SignupState = FormState<keyof SignupInput> & { emailSent?: boolean };

const RATE_LIMITED_MESSAGE = "Too many attempts. Wait a few minutes and try again.";

function isRateLimited(error: APIError) {
  return error.statusCode === 429;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.signInEmail({
      body: { ...parsed.data, callbackURL: CLINIX_ROUTES.app },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (isRateLimited(error)) return { values, message: RATE_LIMITED_MESSAGE };
    // Only reachable with the right password, so it reveals nothing to a guesser.
    if (error.body?.code === "EMAIL_NOT_VERIFIED") {
      return { values, message: "Verify your email first — we've sent you a new link." };
    }
    return { values, message: "Incorrect email or password." };
  }

  revalidatePath(CLINIX_ROUTES.landing, "layout");
  redirect(CLINIX_ROUTES.app);
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    // With email verification required, better-auth answers the same way for
    // a new and an already-registered email, and signs no one in until the
    // link is opened — so this reveals nothing about which emails exist.
    await auth.api.signUpEmail({
      body: { ...parsed.data, callbackURL: CLINIX_ROUTES.onboarding },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (isRateLimited(error)) return { values, message: RATE_LIMITED_MESSAGE };
    return { values, message: "We couldn't create your account. Try again." };
  }

  return { values, emailSent: true };
}

export async function socialSignInAction(formData: FormData) {
  const { provider, intent } = socialSignInSchema.parse(Object.fromEntries(formData));

  const { url } = await auth.api.signInSocial({
    body: {
      provider,
      callbackURL: intent === "signup" ? CLINIX_ROUTES.onboarding : CLINIX_ROUTES.app,
      newUserCallbackURL: CLINIX_ROUTES.onboarding,
    },
    headers: await headers(),
  });

  if (!url) throw new Error(`No redirect URL returned for ${provider} sign-in.`);
  redirect(url);
}

export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = requestPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    // better-auth answers the same way for an unknown address, so the reply
    // below reveals nothing about which emails are registered.
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: CLINIX_ROUTES.resetConfirm },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (isRateLimited(error)) return { values, message: RATE_LIMITED_MESSAGE };
    return { values, message: "We couldn't send the reset link. Try again." };
  }

  return { values, sent: true };
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    if (isRateLimited(error)) return { message: RATE_LIMITED_MESSAGE };
    return { message: "This reset link has expired or was already used. Request a new one." };
  }

  return { done: true };
}

/** Ends the session (better-auth clears the cookie) and returns to the log-in page. */
export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  revalidatePath(CLINIX_ROUTES.landing, "layout");
  redirect(CLINIX_ROUTES.auth);
}
