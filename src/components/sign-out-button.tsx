"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { signOutAction } from "@/src/server/actions/auth";

type SignOutButtonProps = { className?: string; children: ReactNode; "aria-label"?: string };

/** A form, not an onClick, so signing out works before the page has hydrated. */
export function SignOutButton(props: SignOutButtonProps) {
  return (
    <form action={signOutAction} className="contents">
      <SubmitButton {...props} />
    </form>
  );
}

function SubmitButton({ className, children, ...rest }: SignOutButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {children}
    </button>
  );
}
