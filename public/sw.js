/*
 * Clinix PH service worker.
 *
 * What it does: makes the app installable, keeps the app's own static files (scripts,
 * styles, fonts, icons) so it starts fast, and shows a friendly offline screen when a
 * page can't be reached.
 *
 * What it deliberately does NOT do: cache pages, API responses or anything a signed-in
 * person sees. Those hold patient records (RA 10173); they must never be stored on a
 * device by us, and an out-of-date copy of a schedule or a receipt would mislead. Writes
 * are never queued either: MRNs, receipt numbers and double-booking checks all need the
 * server. So offline, the app shows the offline screen and nothing is saved.
 *
 * Bump VERSION to drop old caches on the next visit.
 */
const VERSION = "v1";
const SHELL_CACHE = `clinix-shell-${VERSION}`;
const STATIC_CACHE = `clinix-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== SHELL_CACHE && name !== STATIC_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

/** Hashed build files and our icons never change under the same URL, so they are safe to keep. */
function isStaticAsset(pathname) {
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only plain GETs to our own origin. Form posts, Server Actions and third-party calls pass straight through.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never touch the API (sessions, exports, agent, webhooks) or anything with credentials-bearing intent.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Always ask the network. If it can't be reached, show the offline screen; the page itself is never stored.
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
  // Everything else (including the app's own data requests) goes to the network untouched.
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
