"use client";

import { useState, type ReactNode } from "react";
import type { SocialProvider } from "@/src/lib/constants";
import type { AuthMode } from "../_data";
import { AuthSidePanel } from "./auth-side-panel";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

const EASE = "ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none";

type AuthCardProps = { initialMode: AuthMode; socialProviders: readonly SocialProvider[] };

export function AuthCard({ initialMode, socialProviders }: AuthCardProps) {
  const [mode, setMode] = useState(initialMode);
  const isLogin = mode === "login";
  const toggleMode = () => setMode(isLogin ? "signup" : "login");

  return (
    <div className="relative w-full max-w-[440px] overflow-hidden rounded-[20px] bg-white shadow-xl md:flex md:min-h-[560px] md:max-w-[960px]">
      <AuthSidePanel mode={mode} onToggle={toggleMode} />

      {/* On md+ the form column slides to whichever side the brand panel just left. */}
      <div
        className={`grid w-full place-items-center content-center px-5 py-8 sm:px-10 md:w-[58%] md:py-11 md:transition-transform md:duration-300 ${EASE} ${
          isLogin ? "" : "md:translate-x-[72.41%]"
        }`}
      >
        <AuthPanel active={isLogin} hiddenOffset="-translate-x-6">
          <LoginForm socialProviders={socialProviders} onSwitch={toggleMode} />
        </AuthPanel>
        <AuthPanel active={!isLogin} hiddenOffset="translate-x-6">
          <SignupForm socialProviders={socialProviders} onSwitch={toggleMode} />
        </AuthPanel>
      </div>
    </div>
  );
}

// Both panels share one grid cell, so the column is as tall as the taller
// form and the inactive one crossfades out without collapsing the layout.
function AuthPanel({
  active,
  hiddenOffset,
  children,
}: {
  active: boolean;
  hiddenOffset: string;
  children: ReactNode;
}) {
  return (
    <div
      inert={!active}
      className={`col-start-1 row-start-1 w-full max-w-[340px] transition duration-300 ${EASE} ${
        active ? "translate-x-0 opacity-100" : `pointer-events-none opacity-0 ${hiddenOffset}`
      }`}
    >
      {children}
    </div>
  );
}
