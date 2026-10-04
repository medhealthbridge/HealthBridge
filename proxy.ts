import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clinicSubdomainsEnabled, isAdminHost, isCustomHost, tenantSlugFromHost } from "@/src/lib/clinic-host";
import { ADMIN_INVITE_ROUTE, ADMIN_LOGIN_ROUTE, CLINIX_ROUTES, COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";

const SUBDOMAIN_ROUTES: Record<string, string> = {
  clinix: "/clinix-ph",
};

// What the admin host may serve besides the company admin itself: sign-in, invitations and
// its API. Everything else (clinic consoles, the clinic app) belongs elsewhere.
// Password reset stays reachable for a forgotten password; Clinix sign-in and sign-up do not.
const ADMIN_HOST_ALLOWED = [COMPANY_ADMIN_ROUTE, ADMIN_INVITE_ROUTE, ADMIN_LOGIN_ROUTE, "/api", `${CLINIX_ROUTES.auth}/reset`];

const underPath = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Production only (preview and local hosts serve everything): the company
  // admin lives on admin.databridgesol.space and nowhere else.
  if (clinicSubdomainsEnabled()) {
    if (isAdminHost(host)) {
      if (pathname === "/") return NextResponse.rewrite(new URL(COMPANY_ADMIN_ROUTE, request.url));
      if (!ADMIN_HOST_ALLOWED.some((base) => underPath(pathname, base))) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    }
    if (underPath(pathname, COMPANY_ADMIN_ROUTE)) return new NextResponse(null, { status: 404 });
  }

  const target = SUBDOMAIN_ROUTES[host.split(".")[0]];
  if (target && pathname === "/") {
    return NextResponse.rewrite(new URL(target, request.url));
  }

  // A clinic's own subdomain, or its own domain, opens its console. Whether the
  // signed-in user actually owns that clinic is checked by the console layout,
  // not here: the proxy can't reach the database, and a rewrite is not authorization.
  if (clinicSubdomainsEnabled() && (tenantSlugFromHost(host) || isCustomHost(host)) && pathname === "/") {
    return NextResponse.rewrite(new URL(CLINIX_ROUTES.admin, request.url));
  }

  return NextResponse.next();
}

// Static assets and image routes never need the host checks.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?|html)$|manifest.webmanifest).*)"],
};
