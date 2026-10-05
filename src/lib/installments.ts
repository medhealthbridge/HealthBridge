/** Adds whole months to a YYYY-MM-DD date, clamping to the month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export type Installment = { sequence: number; dueOn: string; amountCents: number };

/**
 * Splits what is still owed after the down payment into monthly parts. Equal parts; the last one
 * takes the leftover centavos so the parts always add up to the balance exactly.
 */
export function buildInstallments(balanceCents: number, count: number, firstDueOn: string): Installment[] {
  if (balanceCents <= 0 || count < 1) return [];
  const each = Math.floor(balanceCents / count);
  return Array.from({ length: count }, (_, index) => ({
    sequence: index + 1,
    dueOn: addMonths(firstDueOn, index),
    amountCents: index === count - 1 ? balanceCents - each * (count - 1) : each,
  }));
}

export type InstallmentStatus = Installment & { paidCents: number; state: "paid" | "partial" | "due" | "overdue" | "upcoming" };

/**
 * Which installments are covered. The down payment is whatever was paid up front (total minus the
 * installments); only money paid beyond it goes toward the installments, oldest first.
 */
export function installmentStatuses(installments: Installment[], totalCents: number, paidCents: number, today: string): InstallmentStatus[] {
  const scheduled = installments.reduce((sum, item) => sum + item.amountCents, 0);
  let available = Math.max(0, paidCents - Math.max(0, totalCents - scheduled));
  return installments.map((item) => {
    const covered = Math.min(item.amountCents, available);
    available -= covered;
    const state = covered >= item.amountCents ? "paid" : item.dueOn < today ? "overdue" : item.dueOn === today ? "due" : covered > 0 ? "partial" : "upcoming";
    return { ...item, paidCents: covered, state: covered > 0 && covered < item.amountCents && item.dueOn >= today ? "partial" : state };
  });
}

/** The next installment that still needs money, and how much of it is left. */
export function nextInstallmentDue(statuses: InstallmentStatus[]) {
  const open = statuses.find((item) => item.state !== "paid");
  return open ? { dueOn: open.dueOn, amountCents: open.amountCents - open.paidCents, overdue: open.state === "overdue" } : null;
}
