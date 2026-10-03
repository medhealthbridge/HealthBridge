"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/src/server/auth";
import { verifyProviderKey } from "@/src/server/agent/providers/verify";
import { removeSecret, saveSecret } from "@/src/server/services/platform-secrets";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";
import { removeKeySchema, saveKeySchema, type SaveKeyField } from "@/src/lib/schemas/ai-settings";
import type { FormState } from "@/src/types/form-state";

export type SaveKeyState = FormState<SaveKeyField> & { saved?: string };

const PATH = `${COMPANY_ADMIN_ROUTE}/ai-settings`;

/** Saves a pasted provider key. The key is never returned, logged or echoed back into the form. */
export async function saveKeyAction(_prev: SaveKeyState, data: FormData): Promise<SaveKeyState> {
  const admin = await requireSuperAdmin();
  const limit = await consumeRateLimit("ai-settings", admin.id, { max: 20, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { message: "Too many changes. Try again later." };

  const parsed = saveKeySchema.safeParse({ name: data.get("name"), key: data.get("key") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const check = await verifyProviderKey(parsed.data.name, parsed.data.key);
  if (check === "invalid") return { fieldErrors: { key: ["The provider rejected this key. Check it and paste it again."] } };

  await saveSecret(parsed.data.name, parsed.data.key, admin.id);
  revalidatePath(PATH);
  return { saved: check === "valid" ? "Key saved and working." : "Key saved, but the provider couldn't be reached to confirm it works." };
}

export async function removeKeyAction(data: FormData) {
  await requireSuperAdmin();
  const parsed = removeKeySchema.safeParse({ name: data.get("name") });
  if (!parsed.success) return;
  await removeSecret(parsed.data.name);
  revalidatePath(PATH);
}
