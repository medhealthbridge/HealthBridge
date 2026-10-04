"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password field with an eye button that shows or hides what was typed.
 * Hidden by default; the button is a real, labelled control (not a click on the
 * icon alone), and it never submits the form. Works in both the light auth pages
 * and the dark/light console: the input keeps whatever styling the caller gives it.
 */
export function PasswordInput({ className = "", ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative w-full min-w-0">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-[10px] text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </button>
    </div>
  );
}
