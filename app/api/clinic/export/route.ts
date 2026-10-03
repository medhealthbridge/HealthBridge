import { getAgentClinic } from "@/src/server/auth";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { buildExport, EXPORT_KINDS, type ExportKind } from "@/src/server/services/exports";

/** Owner-only CSV download. The clinic comes from the session and host; the only input is which list. */
export async function GET(request: Request) {
  const ctx = await getAgentClinic();
  if (!ctx || ctx.clinic.role !== "owner") return Response.json({ error: "Not found." }, { status: 404 });
  const kind = new URL(request.url).searchParams.get("kind");
  if (!EXPORT_KINDS.includes(kind as ExportKind)) return Response.json({ error: "Unknown export." }, { status: 400 });
  const limit = await consumeRateLimit("clinic-export", ctx.user.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return Response.json({ error: "Too many exports. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const csv = await buildExport(ctx.clinic, ctx.user.id, kind as ExportKind);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ctx.clinic.subdomain}-${kind}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
