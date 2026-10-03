import { z } from "zod";
import { getSession } from "@/src/server/auth";
import { askAdminAssistant } from "@/src/server/agent/admin-assistant";
import { platformRoleOf } from "@/src/server/services/access";
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

/** Company-admin assistant. Team members only; the conversation is text, and every tool runs on the server. */
export async function POST(request: Request) {
  const session = await getSession();
  const role = session?.user.emailVerified ? await platformRoleOf(session.user.id) : null;
  if (!session || !role) return json({ error: "Not found." }, 404);

  const limit = await consumeRateLimit("admin-agent", session.user.id, { max: 30, windowSeconds: 10 * 60 });
  if (!limit.allowed) {
    return Response.json({ error: "Too many questions. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Send up to 20 text messages, ending with yours." }, 400);

  try {
    return json(await askAdminAssistant({ userId: session.user.id, canPropose: role === "super_admin", history: parsed.data.messages }));
  } catch (error) {
    console.error("[agent] admin request failed:", error instanceof Error ? error.message : "unknown error");
    return json({ error: "The assistant is unavailable right now. Try again shortly." }, 502);
  }
}
