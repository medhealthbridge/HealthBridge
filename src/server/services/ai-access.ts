import { eq } from "drizzle-orm";
import { withAccount } from "@/src/server/db/client";
import { accounts } from "@/src/server/db/schema";
import type { StaffClinic } from "./clinic-app";
import { patientDataAiAllowed } from "./platform-settings";

export type AiAccess = { allowed: true } | { allowed: false; reason: "role" | "not_granted" | "patient_data_off" };

/**
 * Whether this clinic's owner may use the AI assistant: they own the clinic,
 * the company admin has granted their account, and the company has confirmed
 * patient data may go to its AI providers.
 */
/** Granted by the company admin and permitted company-wide; says nothing about who in the clinic may use it. */
export async function aiGrantedFor(accountId: string) {
  const [account] = await withAccount(accountId, (tx) =>
    tx.select({ enabled: accounts.aiAssistantEnabled }).from(accounts).where(eq(accounts.id, accountId)).limit(1),
  );
  return Boolean(account?.enabled) && (await patientDataAiAllowed());
}

export async function clinicAiAccess(clinic: StaffClinic): Promise<AiAccess> {
  if (clinic.role !== "owner") return { allowed: false, reason: "role" };
  const [account] = await withAccount(clinic.accountId, (tx) =>
    tx.select({ enabled: accounts.aiAssistantEnabled }).from(accounts).where(eq(accounts.id, clinic.accountId)).limit(1),
  );
  if (!account?.enabled) return { allowed: false, reason: "not_granted" };
  if (!(await patientDataAiAllowed())) return { allowed: false, reason: "patient_data_off" };
  return { allowed: true };
}
