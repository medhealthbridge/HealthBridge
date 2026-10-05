import { timingSafeEqual } from "node:crypto";
import { runDailyRecalls } from "@/src/server/services/recalls";
import { runDailyReminders } from "@/src/server/services/reminders";

export const maxDuration = 300;

/** Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`. Without the secret set, it refuses everything. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Not configured." }, { status: 503 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "Not found." }, { status: 404 });
  const appointments = await runDailyReminders();
  const recalls = await runDailyRecalls();
  return Response.json({ appointments, recalls });
}
