import { and, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { withTenant } from "@/src/server/db/client";
import { appointments, invoices, patients, payments } from "@/src/server/db/schema";
import type { Kpi, MeterRow, Stat, Tone } from "@/src/types/console";
import { formatPeso } from "@/src/lib/utils";
import { addDays, clinicDateString, listTodayAppointments, type StaffClinic, type TodayAppointment } from "./clinic-app";
import { listInventory, type InventoryRow } from "./inventory";

export type Overview = {
  asOf: string;
  kpis: Kpi[];
  queue: TodayAppointment[];
  queueSummary: { label: string; tone: Tone }[];
  collections: MeterRow[];
  lowStock: InventoryRow[];
  stats: Stat[];
};

const METHOD_LABELS: Record<string, string> = { cash: "Cash", gcash: "GCash", maya: "Maya", card: "Card", hmo: "HMO / PhilHealth" };
const METHOD_TONES: Tone[] = ["accent", "info", "warn", "neutral", "neutral"];

/** Bar heights (10–100) for a sparkline from a series of daily totals. */
export function sparkHeights(series: number[]): number[] {
  const max = Math.max(...series, 0);
  return series.map((value) => (max === 0 ? 10 : Math.max(10, Math.round((value / max) * 100))));
}

/** "+12%" style change, or "—" when there is nothing to compare with. */
export function changeLabel(now: number, before: number): string {
  if (before <= 0) return now > 0 ? "new" : "—";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

export async function getOverview(clinic: Pick<StaffClinic, "id" | "timezone" | "staffId">): Promise<Overview> {
  const today = clinicDateString(clinic.timezone);
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const lastWeekSameDay = addDays(today, -7);
  const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

  const [queue, inventory, data] = await Promise.all([
    listTodayAppointments(clinic),
    listInventory(clinic.id, today),
    withTenant(clinic.id, async (tx) => {
      // Money actually collected: each payment on a receipt that isn't void. A bill put on account counts when it is paid.
      const paid = await tx
        .select({ id: payments.id, totalCents: payments.amountCents, issuedAt: payments.paidAt })
        .from(payments)
        .innerJoin(invoices, and(eq(invoices.clinicId, payments.clinicId), eq(invoices.id, payments.invoiceId)))
        .where(and(eq(payments.clinicId, clinic.id), ne(invoices.status, "void"), gte(payments.paidAt, since)));
      const methods = await tx
        .select({ method: payments.method, total: sql<number>`sum(${payments.amountCents})::int` })
        .from(payments)
        .innerJoin(invoices, and(eq(invoices.clinicId, payments.clinicId), eq(invoices.id, payments.invoiceId)))
        .where(and(eq(payments.clinicId, clinic.id), ne(invoices.status, "void"), gte(payments.paidAt, since)))
        .groupBy(payments.method);
      const attended = await tx
        .select({ status: appointments.status, count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(eq(appointments.clinicId, clinic.id), inArray(appointments.status, ["completed", "no_show"]), gte(appointments.startsAt, since)))
        .groupBy(appointments.status);
      const [newPatients] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(and(eq(patients.clinicId, clinic.id), isNull(patients.deletedAt), gte(patients.createdAt, since)));
      return { paid, methods, attended, newPatients: newPatients?.count ?? 0 };
    }),
  ]);

  const perDay = new Map<string, number>();
  for (const invoice of data.paid) {
    if (!invoice.issuedAt) continue;
    const key = clinicDateString(clinic.timezone, invoice.issuedAt);
    perDay.set(key, (perDay.get(key) ?? 0) + invoice.totalCents);
  }
  const series = days.map((day) => perDay.get(day) ?? 0);
  const revenueToday = perDay.get(today) ?? 0;
  const revenueLastWeek = perDay.get(lastWeekSameDay) ?? 0;
  const receiptsToday = data.paid.filter((invoice) => invoice.issuedAt && clinicDateString(clinic.timezone, invoice.issuedAt) === today).length;

  const count = (...statuses: string[]) => queue.filter((row) => statuses.includes(row.status)).length;
  const inRoom = count("in_progress");
  const waiting = count("checked_in");
  const booked = count("requested", "confirmed");
  const attention = inventory.filter((row) => row.status !== "ok" || row.expiredQty > 0);
  const critical = inventory.filter((row) => row.status === "out").length;

  const methodTotal = data.methods.reduce((total, row) => total + row.total, 0);
  const collections = [...data.methods]
    .sort((a, b) => b.total - a.total)
    .map((row, index) => ({
      name: METHOD_LABELS[row.method] ?? row.method,
      value: formatPeso(row.total / 100),
      pct: methodTotal === 0 ? 0 : Math.round((row.total / methodTotal) * 100),
      tone: METHOD_TONES[Math.min(index, METHOD_TONES.length - 1)],
    }));

  const noShows = data.attended.find((row) => row.status === "no_show")?.count ?? 0;
  const completed = data.attended.find((row) => row.status === "completed")?.count ?? 0;
  const noShowRate = noShows + completed === 0 ? "—" : `${Math.round((noShows / (noShows + completed)) * 100)}%`;
  const dayLabel = new Intl.DateTimeFormat("en-PH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: clinic.timezone }).format(new Date());

  return {
    asOf: dayLabel,
    kpis: [
      { label: "Revenue today", value: formatPeso(revenueToday / 100), delta: changeLabel(revenueToday, revenueLastWeek), deltaTone: revenueToday >= revenueLastWeek ? "accent" : "warn", sub: `vs ${formatPeso(revenueLastWeek / 100)} last week`, sparkTone: "accent", spark: sparkHeights(series) },
      { label: "Queue / booked", value: String(queue.length), delta: `${inRoom} in room`, deltaTone: "info", sub: `${waiting} waiting · ${booked} booked today`, sparkTone: "info", spark: sparkHeights([inRoom, waiting, booked, queue.length]) },
      { label: "Stock alerts", value: String(attention.length), delta: critical > 0 ? `${critical} out` : "OK", deltaTone: critical > 0 ? "danger" : "accent", sub: attention.length ? "Low, out or expiring items" : "Nothing needs reordering", sparkTone: "warn", spark: sparkHeights([attention.length]) },
      { label: "Payments today", value: String(receiptsToday), delta: `${data.paid.length} in 30 days`, deltaTone: "neutral", sub: "Payments taken, not voided", sparkTone: "neutral", spark: sparkHeights(days.map((day) => data.paid.filter((invoice) => invoice.issuedAt && clinicDateString(clinic.timezone, invoice.issuedAt) === day).length)) },
    ],
    queue,
    queueSummary: [
      { label: `${inRoom} in room`, tone: "info" },
      { label: `${waiting} waiting`, tone: "warn" },
      { label: `${booked} booked`, tone: "neutral" },
    ],
    collections,
    lowStock: attention.slice(0, 6),
    stats: [
      { label: "No-show rate", value: noShowRate, sub: "Last 30 days, completed vs no-show" },
      { label: "New patients", value: String(data.newPatients), sub: "Added in the last 30 days" },
      { label: "Collected (30 days)", value: formatPeso(methodTotal / 100), sub: "All payment methods" },
    ],
  };
}
