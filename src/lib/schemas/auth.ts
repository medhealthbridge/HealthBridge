import { z } from "zod";
import { SOCIAL_PROVIDERS } from "@/src/lib/constants";

const email = z.email("Enter a valid email address.").trim().toLowerCase();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

// 8–128 matches better-auth's default password length limits.
export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Use at most 128 characters."),
});

export const requestPasswordResetSchema = z.object({ email });

// Same 8–128 bounds as sign-up, so a reset can't set a password the
// sign-up form would have rejected.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "This reset link is incomplete. Request a new one."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Use at most 128 characters."),
});

export const socialSignInSchema = z.object({
  provider: z.enum(SOCIAL_PROVIDERS),
  intent: z.enum(["login", "signup"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
