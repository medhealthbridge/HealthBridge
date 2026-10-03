import { z } from "zod";
import { getAgentClinic } from "@/src/server/auth";
import { askClinicAssistant } from "@/src/server/agent/clinic-assistant";
import { clinicAiAccess } from "@/src/server/services/ai-access";
import { consumeRateLimit } from "@/src/server/services/rate-limit";

export const maxDuration = 120;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be from the user."),
});

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** The clinic owner's assistant. The clinic comes from the session and host, never from the request body. */
export async function POST(request: Request) {
  const ctx = await getAgentClinic();
  if (!ctx) return json({ error: "Not found." }, 404);
  if (!(await clinicAiAccess(ctx.clinic)).allowed) return json({ error: "The assistant isn't available for this clinic." }, 403);

  const limit = await consumeRateLimit("clinic-agent", ctx.user.id, { max: 30, windowSeconds: 10 * 60 });
  if (!limit.allowed) {
    return Response.json({ error: "Too many questions. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Send up to 20 text messages, ending with yours." }, 400);

  try {
    return json(await askClinicAssistant({ userId: ctx.user.id, clinic: ctx.clinic, history: parsed.data.messages }));
  } catch (error) {
    console.error("[agent] clinic request failed:", error instanceof Error ? error.message : "unknown error");
    return json({ error: "The assistant is unavailable right now. Try again shortly." }, 502);
  }
}
