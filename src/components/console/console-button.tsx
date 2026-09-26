import type { ComponentProps } from "react";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border font-text font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-accent disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS = {
  primary: "border-console-accent bg-console-accent text-console-on-accent hover:bg-console-accent/90",
  secondary: "border-console-line bg-console-panel text-console-ink hover:border-console-accent/50",
  danger: "border-console-danger/50 bg-transparent text-console-danger hover:bg-console-danger/10",
} as const;

const SIZES = {
  md: "min-h-11 px-3.5 text-[13px] md:min-h-9",
  sm: "min-h-11 px-2.5 text-xs md:min-h-8",
} as const;

export type ConsoleButtonVariant = keyof typeof VARIANTS;

export function consoleButtonClass(variant: ConsoleButtonVariant = "secondary", size: keyof typeof SIZES = "md", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

type ConsoleButtonProps = ComponentProps<"button"> & {
  variant?: ConsoleButtonVariant;
  size?: keyof typeof SIZES;
};

export function ConsoleButton({ variant, size, className, type = "button", ...props }: ConsoleButtonProps) {
  return <button type={type} className={consoleButtonClass(variant, size, className)} {...props} />;
}
