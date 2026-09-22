import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUBDOMAIN_ROUTES: Record<string, string> = {
  clinix: "/clinix-ph",
};

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const subdomain = host.split(".")[0];
  const target = SUBDOMAIN_ROUTES[subdomain];

  if (target && request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
