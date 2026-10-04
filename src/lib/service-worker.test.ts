import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Handler = (event: unknown) => void;

/** Loads public/sw.js against a fake worker scope so its real fetch rules can be exercised. */
function loadWorker() {
  const handlers: Record<string, Handler> = {};
  const cached: string[] = [];
  const network = { fail: false };
  const caches = {
    open: async () => ({ addAll: async () => undefined, put: async (request: { url: string }) => void cached.push(request.url) }),
    match: async (key: string | { url: string }) => (typeof key === "string" && key === "/offline.html" ? { offline: true } : undefined),
    keys: async () => [],
    delete: async () => true,
  };
  const scope = {
    location: { origin: "https://demo.databridgesol.space" },
    addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  const fetchImpl = async () => {
    if (network.fail) throw new Error("offline");
    return { ok: true, clone: () => ({}) };
  };
  runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), { self: scope, caches, fetch: fetchImpl, URL, Promise });
  return { handlers, cached, network };
}

function dispatch(handlers: Record<string, Handler>, request: { url: string; method?: string; mode?: string }) {
  let response: Promise<unknown> | undefined;
  handlers.fetch({ request: { method: "GET", mode: "cors", ...request }, respondWith: (value: Promise<unknown>) => (response = value) });
  return response;
}

const BASE = "https://demo.databridgesol.space";

describe("service worker", () => {
  it("shows the offline screen when a page can't be reached, and never stores the page", async () => {
    const { handlers, cached, network } = loadWorker();
    network.fail = true;
    const result = await dispatch(handlers, { url: `${BASE}/clinix-ph/admin/patients`, mode: "navigate" });
    expect(result).toEqual({ offline: true });
    expect(cached).toEqual([]);
  });

  it("passes a page straight through when online, without caching it", async () => {
    const { handlers, cached } = loadWorker();
    await dispatch(handlers, { url: `${BASE}/clinix-ph/admin`, mode: "navigate" });
    expect(cached).toEqual([]);
  });

  it("keeps hashed build files and icons", async () => {
    const { handlers, cached } = loadWorker();
    await dispatch(handlers, { url: `${BASE}/_next/static/chunks/app.js` });
    await dispatch(handlers, { url: `${BASE}/icons/icon-192.png` });
    expect(cached).toEqual([`${BASE}/_next/static/chunks/app.js`, `${BASE}/icons/icon-192.png`]);
  });

  it("never touches the API, writes, other origins or data requests", () => {
    const { handlers } = loadWorker();
    expect(dispatch(handlers, { url: `${BASE}/api/clinic/export?kind=patients` })).toBeUndefined();
    expect(dispatch(handlers, { url: `${BASE}/api/auth/get-session` })).toBeUndefined();
    expect(dispatch(handlers, { url: `${BASE}/clinix-ph/admin/patients`, method: "POST", mode: "navigate" })).toBeUndefined();
    expect(dispatch(handlers, { url: "https://fonts.gstatic.com/x.woff2" })).toBeUndefined();
    expect(dispatch(handlers, { url: `${BASE}/clinix-ph/admin/patients?_rsc=abc` })).toBeUndefined();
  });
});
