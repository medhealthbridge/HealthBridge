import type { Tone } from "@/src/types/console";

export const TENANT_STATUSES = ["Active", "Trial", "Past due", "Cancelled"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const TENANT_STATUS_TONE: Record<TenantStatus, Tone> = {
  Active: "accent",
  Trial: "info",
  "Past due": "warn",
  Cancelled: "neutral",
};
