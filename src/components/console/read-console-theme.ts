import { cookies } from "next/headers";
import { CONSOLE_THEMES, CONSOLE_THEME_COOKIE, type ConsoleTheme } from "@/src/lib/constants";

/** Theme the console layout should render with; dark unless the viewer chose light. */
export async function readConsoleTheme(): Promise<ConsoleTheme> {
  const value = (await cookies()).get(CONSOLE_THEME_COOKIE)?.value;
  return CONSOLE_THEMES.find((theme) => theme === value) ?? "dark";
}
