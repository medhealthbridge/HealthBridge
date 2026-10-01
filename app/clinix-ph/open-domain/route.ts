import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth, requireClinicOwner } from "@/src/server/auth";
import { customDomainOf } from "@/src/server/services/custom-domains";
import { CLINIX_ROUTES } from "@/src/lib/constants";
import { clinicSubdomainsEnabled } from "@/src/lib/clinic-host";

/**
 * Signed in on the product host, bound for the clinic's own domain: a custom
 * domain can't read this host's session cookie, so a one-time token carries the
 * session across (see app/api/handoff).
 */
export async function GET(request: Request) {
  const { clinicIds } = await requireClinicOwner();
  const domain = clinicSubdomainsEnabled() ? await customDomainOf(clinicIds[0]) : null;
  if (!domain) return NextResponse.redirect(new URL(CLINIX_ROUTES.admin, request.url));

  const { token } = await auth.api.generateOneTimeToken({ headers: await headers() });
  return NextResponse.redirect(`https://${domain}/api/handoff?token=${encodeURIComponent(token)}`);
}
