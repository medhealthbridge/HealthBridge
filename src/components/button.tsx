import type { ComponentProps } from "react";

const BASE =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-5 font-display text-sm font-extrabold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand/90",
  secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
} as const;

type Variant = keyof typeof VARIANTS;

/** For links that should look like buttons (e.g. next/link). */
export function buttonClassName(variant: Variant = "primary", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
