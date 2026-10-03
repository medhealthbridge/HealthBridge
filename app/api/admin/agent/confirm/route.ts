import { z } from "zod";
import { getSession } from "@/src/server/auth";
import { platformRoleOf } from "@/src/server/services/access";
import { cancelAction, confirmAction } from "@/src/server/services/agent-actions";
import { consumeRateLimit } from "@/src/server/services/rate-limit";

const bodySchema = z.object({ actionId: z.uuid(), decision: z.enum(["confirm", "cancel"]) });

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Applies or drops a change the assistant prepared. Founder only, and only the person it was prepared for. */
export async function POST(request: Request) {
  const session = await getSession();
  // The role is checked again here: a proposal made earlier must not outlive a demotion.
  if (!session?.user.emailVerified || (await platformRoleOf(session.user.id)) !== "super_admin") return json({ error: "Not found." }, 404);

  const limit = await consumeRateLimit("admin-agent-confirm", session.user.id, { max: 30, windowSeconds: 10 * 60 });
  if (!limit.allowed) return json({ error: "Too many requests. Try again shortly." }, 429);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);

  if (parsed.data.decision === "cancel") {
    await cancelAction(session.user.id, parsed.data.actionId);
    return json({ ok: true, message: "Cancelled." });
  }
  return json(await confirmAction({ id: session.user.id, name: session.user.name }, parsed.data.actionId));
}
