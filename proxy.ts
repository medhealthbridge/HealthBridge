import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clinicSubdomainsEnabled, isCustomHost, tenantSlugFromHost } from "@/src/lib/clinic-host";
import { CLINIX_ROUTES } from "@/src/lib/constants";

const SUBDOMAIN_ROUTES: Record<string, string> = {
  clinix: "/clinix-ph",
};

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const target = SUBDOMAIN_ROUTES[host.split(".")[0]];

  if (target && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL(target, request.url));
  }

  // A clinic's own subdomain opens its console. Whether the signed-in user
  // actually owns that clinic is checked by the console layout, not here: the
  // proxy can't reach the database, and a route rewrite is not authorization.
  // A clinic's own domain does the same; the layout then resolves it through domain_lookups.
  if (
    clinicSubdomainsEnabled() &&
    (tenantSlugFromHost(host) || isCustomHost(host)) &&
    request.nextUrl.pathname === "/"
  ) {
    return NextResponse.rewrite(new URL(CLINIX_ROUTES.admin, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
