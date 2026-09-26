import type { Tone } from "@/src/types/console";

/** Tinted background + matching text, for pills and badges. */
export const TONE_SOFT: Record<Tone, string> = {
  accent: "bg-console-accent/15 text-console-accent",
  info: "bg-console-info/15 text-console-info",
  warn: "bg-console-warn/15 text-console-warn",
  danger: "bg-console-danger/15 text-console-danger",
  neutral: "bg-console-ink/8 text-console-muted",
};

export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-console-accent",
  info: "text-console-info",
  warn: "text-console-warn",
  danger: "text-console-danger",
  neutral: "text-console-ink",
};

export const TONE_FILL: Record<Tone, string> = {
  accent: "bg-console-accent",
  info: "bg-console-info",
  warn: "bg-console-warn",
  danger: "bg-console-danger",
  neutral: "bg-console-muted",
};
