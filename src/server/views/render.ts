"use server";

import type { ReactNode } from "react";
import { isViewName } from "./names";
import { VIEWS } from "./registry";

type Params = Record<string, string>;

/** Only short strings go through: route params and query strings, nothing else. */
function clean(input: unknown): Params {
  if (!input || typeof input !== "object") return {};
  const out: Params = {};
  for (const [key, value] of Object.entries(input).slice(0, 10)) {
    if (typeof key === "string" && key.length <= 40 && typeof value === "string") out[key] = value.slice(0, 120);
  }
  return out;
}

/**
 * Renders one page's content on the server for the client cache. It runs the page's own code, so every
 * permission and clinic check runs again on each call: the cache only remembers what this user already saw.
 */
export async function renderView(name: string, params: unknown, searchParams: unknown): Promise<ReactNode> {
  if (!isViewName(name)) throw new Error("Unknown view.");
  const View = VIEWS[name];
  return View({ params: Promise.resolve(clean(params)), searchParams: Promise.resolve(clean(searchParams)) });
}
