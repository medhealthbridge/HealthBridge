"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth, requirePlatformAdmin, requireSuperAdmin } from "@/src/server/auth";
import { SubdomainTakenError, WorkspaceExistsError } from "@/src/server/services/onboarding";
import { consumeRateLimit } from "@/src/server/services/rate-limit";
import { createTenant, setTenantAiAccess } from "@/src/server/services/tenant-admin";
import { CLINIX_ROUTES, COMPANY_ADMIN_ROUTE } from "@/src/lib/constants";
import { newTenantSchema, type NewTenantField } from "@/src/lib/schemas/tenant";
import type { FormState } from "@/src/types/form-state";

export type NewTenantState = FormState<NewTenantField> & { created?: { company: string; email: string; emailed: boolean } };

const FIELDS = ["companyName", "ownerName", "ownerEmail", "subdomain", "branchName", "branchCity", "specialty", "tier", "plan"] as const;

export async function createTenantAction(_prev: NewTenantState, data: FormData): Promise<NewTenantState> {
  const admin = await requirePlatformAdmin();
  const values = Object.fromEntries(FIELDS.map((key) => [key, String(data.get(key) ?? "")]));

  const limit = await consumeRateLimit("tenant-create", admin.id, { max: 30, windowSeconds: 60 * 60 });
  if (!limit.allowed) return { values, message: "Too many tenants created in a short time. Wait a while and try again." };

  const parsed = newTenantSchema.safeParse(values);
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    await createTenant(admin.id, parsed.data);
  } catch (error) {
    if (error instanceof SubdomainTakenError) return { values, fieldErrors: { subdomain: ["That subdomain is already taken."] } };
    if (error instanceof WorkspaceExistsError) {
      return { values, fieldErrors: { ownerEmail: ["This person already owns a tenant. Add branches to it instead."] } };
    }
    throw error;
  }

  // The account exists either way; a failed email only means the admin must resend.
  let emailed = true;
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.ownerEmail, redirectTo: CLINIX_ROUTES.resetConfirm },
      headers: await headers(),
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    emailed = false;
  }

  revalidatePath(`${COMPANY_ADMIN_ROUTE}/tenants`);
  return { created: { company: parsed.data.companyName, email: parsed.data.ownerEmail, emailed } };
}

/** Founder-only switch for a tenant owner's AI assistant. Revoking takes effect immediately, including on prepared changes. */
export async function setTenantAiAccessAction(data: FormData): Promise<{ message?: string }> {
  await requireSuperAdmin();
  const parsed = z.object({ accountId: z.uuid(), enabled: z.enum(["true", "false"]) }).safeParse({ accountId: data.get("accountId"), enabled: data.get("enabled") });
  if (!parsed.success) return { message: "That change isn't allowed." };
  await setTenantAiAccess(parsed.data.accountId, parsed.data.enabled === "true");
  revalidatePath(`${COMPANY_ADMIN_ROUTE}/tenants`);
  return {};
}
