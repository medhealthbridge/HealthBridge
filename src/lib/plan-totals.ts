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

/**
 * Whether staff may set the plan to `next` by hand. Plans that have started or finished can't be stepped back to
 * draft/proposed/accepted (that would hide finished work); only the item buttons move them. A cancelled plan only reopens as a draft.
 */
export function canSetPlanStatus(current: PlanStatus, next: "draft" | "proposed" | "accepted" | "cancelled", frontDesk = false): string | null {
  if (current === next) return null;
  // The front desk only moves a plan forward: shown to the patient, then agreed. Stepping back or cancelling is the doctors'.
  if (frontDesk && !((current === "draft" && (next === "proposed" || next === "accepted")) || (current === "proposed" && next === "accepted"))) return "Only the dentist or owner can do that.";
  if (current === "cancelled" && next !== "draft") return "A cancelled plan can only be reopened as a draft.";
  if ((current === "in_progress" || current === "completed") && next !== "cancelled") return "Work on this plan has started. Undo the finished items to change its status.";
  return null;
}
