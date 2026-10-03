import { cookies } from "next/headers";
import { z } from "zod";
import { getAgentClinic } from "@/src/server/auth";
import { cancelClinicAction, confirmClinicAction } from "@/src/server/services/clinic-agent-actions";
import { clinicAiAccess } from "@/src/server/services/ai-access";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { issueUnlockToken, unlockTokenValid } from "@/src/server/services/step-up";

const UNLOCK_COOKIE = "agent_unlock";

const bodySchema = z.object({
  actionId: z.uuid(),
  decision: z.enum(["confirm", "cancel"]),
  password: z.string().max(200).optional(),
  typed: z.string().max(40).optional(),
});

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * Applies or drops a change the assistant prepared. Owner only, and access is
 * checked again here so a proposal can't outlive a revoked grant. Edits need a
 * recent password (an httpOnly unlock cookie lasts 10 minutes); archiving needs
 * the password every time plus the record's MRN typed out.
 */
export async function POST(request: Request) {
  const ctx = await getAgentClinic();
  if (!ctx) return json({ error: "Not found." }, 404);
  if (!(await clinicAiAccess(ctx.clinic)).allowed) return json({ error: "The assistant isn't available for this clinic." }, 403);

  const limit = await consumeRateLimit("clinic-agent-confirm", ctx.user.id, { max: 40, windowSeconds: 10 * 60 });
  if (!limit.allowed) return json({ error: "Too many requests. Try again shortly." }, 429);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const who = { id: ctx.user.id, clinic: ctx.clinic };

  if (parsed.data.decision === "cancel") {
    await cancelClinicAction(who, parsed.data.actionId);
    return json({ ok: true, message: "Cancelled." });
  }

  const jar = await cookies();
  const outcome = await confirmClinicAction(who, parsed.data.actionId, {
    password: parsed.data.password,
    typed: parsed.data.typed,
    unlocked: unlockTokenValid(ctx.user.id, jar.get(UNLOCK_COOKIE)?.value),
  });
  if (outcome.ok && outcome.grantUnlock) {
    const { token, maxAge } = issueUnlockToken(ctx.user.id);
    jar.set(UNLOCK_COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/api/clinic", maxAge });
  }
  return json(outcome);
}
