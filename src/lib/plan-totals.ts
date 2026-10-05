import type { PlanItemStatus, PlanStatus } from "@/src/server/db/schema/dental";

export type PlanItemLike = { phase: number; status: PlanItemStatus; unitPriceCents: number; quantity: number; invoiceId: string | null };

export const itemTotal = (item: Pick<PlanItemLike, "unitPriceCents" | "quantity">) => item.unitPriceCents * item.quantity;

/** Estimate = everything not cancelled. Done = work finished. Billed = already on a receipt. */
export function planSummary(items: PlanItemLike[]) {
  const active = items.filter((item) => item.status !== "cancelled");
  const sum = (list: PlanItemLike[]) => list.reduce((total, item) => total + itemTotal(item), 0);
  const phases = [...new Set(active.map((item) => item.phase))].sort((a, b) => a - b);
  return {
    estimateCents: sum(active),
    doneCents: sum(active.filter((item) => item.status === "done")),
    billedCents: sum(active.filter((item) => item.invoiceId)),
    toBillCents: sum(active.filter((item) => !item.invoiceId)),
    activeCount: active.length,
    doneCount: active.filter((item) => item.status === "done").length,
    byPhase: phases.map((phase) => ({ phase, totalCents: sum(active.filter((item) => item.phase === phase)), done: active.filter((item) => item.phase === phase && item.status === "done").length, count: active.filter((item) => item.phase === phase).length })),
  };
}

/** Where the plan stands after its items changed. Cancelled plans stay cancelled; a finished plan becomes completed; the first finished item starts one that was agreed. */
export function nextPlanStatus(current: PlanStatus, items: PlanItemLike[]): PlanStatus {
  if (current === "cancelled") return current;
  const active = items.filter((item) => item.status !== "cancelled");
  if (active.length === 0) return current === "completed" ? "draft" : current;
  if (active.every((item) => item.status === "done")) return "completed";
  if (active.some((item) => item.status === "done")) return "in_progress";
  return current === "completed" || current === "in_progress" ? "accepted" : current;
}
