import { eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { platformSettings } from "@/src/server/db/schema";

export const SETTING_KEYS = ["allow_patient_data_ai"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: SettingKey, value: string, userId: string) {
  const row = { value, updatedByUserId: userId, updatedAt: new Date() };
  await db.insert(platformSettings).values({ key, ...row }).onConflictDoUpdate({ target: platformSettings.key, set: row });
}

/** Off unless the founder has confirmed their AI provider keys are on a plan that doesn't train on prompts. */
export async function patientDataAiAllowed() {
  return (await getSetting("allow_patient_data_ai")) === "true";
}
