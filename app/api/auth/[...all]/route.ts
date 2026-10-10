import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/src/server/auth";
import { isPublicAuthEndpoint } from "@/src/lib/auth-routes";

// Only email links and OAuth callbacks are reachable over HTTP. Sign-up, sign-in and every other change go
// through Server Actions in src/server/actions/ (see src/lib/auth-routes.ts for why).
const handler = toNextJsHandler(auth);
const AUTH_PREFIX = "/api/auth";

function guard(run: (request: Request) => Promise<Response>) {
  return (request: Request) => {
    const path = new URL(request.url).pathname.slice(AUTH_PREFIX.length);
    if (!isPublicAuthEndpoint(request.method, path)) return new Response("Not found", { status: 404 });
    return run(request);
  };
}

export const GET = guard(handler.GET);
export const POST = guard(handler.POST);
