import { NextResponse } from "next/server";
import { auth } from "@/src/server/auth";
import { isCustomHost } from "@/src/lib/clinic-host";
import { clinicIdForCustomDomain } from "@/src/server/services/custom-domains";
import { CLINIX_ROUTES } from "@/src/lib/constants";

/**
 * Lands a one-time token on a clinic's own domain and turns it into a session
 * cookie there. better-auth scopes its cookie to `.databridgesol.space`, which
 * a browser refuses on any other domain, so the Domain attribute is dropped and
 * the cookie becomes host-only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const token = url.searchParams.get("token");
  const home = new URL(CLINIX_ROUTES.admin, url.origin);

  // Only a domain we have sold may mint a session this way.
  if (!token || !host || !isCustomHost(host) || !(await clinicIdForCustomDomain(host))) {
    return NextResponse.redirect(new URL(CLINIX_ROUTES.auth, url.origin));
  }

  let verified: Response;
  try {
    verified = await auth.api.verifyOneTimeToken({ body: { token }, headers: request.headers, asResponse: true });
  } catch {
    return NextResponse.redirect(new URL(CLINIX_ROUTES.auth, url.origin));
  }
  if (!verified.ok) return NextResponse.redirect(new URL(CLINIX_ROUTES.auth, url.origin));

  const response = NextResponse.redirect(home);
  for (const cookie of verified.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie.replace(/;\s*domain=[^;]+/i, ""));
  }
  return response;
}
