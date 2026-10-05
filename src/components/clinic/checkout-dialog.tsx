"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { checkoutAction, type CheckoutState } from "@/src/server/actions/billing";
import { describeDiscount, parseDiscountAmount } from "@/src/lib/discounts";
import { invoiceTotalsFor, STATUTORY_LABELS, type DiscountRule } from "@/src/lib/invoice-totals";
import { MAX_INSTALLMENTS, PAYMENT_LABELS, PAYMENT_METHODS } from "@/src/lib/schemas/invoice";
import { formatPesoExact } from "@/src/lib/utils";

const INITIAL: CheckoutState = {};

export type CheckoutService = { id: string; name: string; priceCentavos: number; vatExempt: boolean };
export type CheckoutPlanItem = { id: string; patientId: string; planTitle: string; phase: number; description: string; tooth: number | null; surfaces: string | null; quantity: number; unitPriceCents: number; vatExempt: boolean; status: string };
export type CheckoutDiscount = { id: string; name: string; kind: "percent" | "fixed"; value: number; requiresId: boolean };

const INSTALLMENT_CHOICES = [2, 3, 4, 6, 10, 12, 18, MAX_INSTALLMENTS];
const peso = (cents: number) => formatPesoExact(cents / 100);
const toCents = (text: string) => Math.round(Number(text.replace(/[,₱\s]/g, "")) * 100);

/**
 * Takes payment at the counter, or puts it on account. The total shown is a preview: the server
 * re-reads prices and the agreed treatment plan and recomputes everything.
 */
export function CheckoutDialog({
  patients, services, planItems = [], discounts = [], defaultPatientId, receiptsPath, canCustomDiscount = false, today,
}: {
  patients: { id: string; label: string }[];
  services: CheckoutService[];
  planItems?: CheckoutPlanItem[];
  discounts?: CheckoutDiscount[];
  defaultPatientId?: string;
  receiptsPath: string;
  canCustomDiscount?: boolean;
  /** Clinic-local YYYY-MM-DD, for the earliest installment date. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(checkoutAction, INITIAL);
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState("none");
  const [savedId, setSavedId] = useState("");
  const [customKind, setCustomKind] = useState<"percent" | "fixed">("percent");
  const [customValue, setCustomValue] = useState("");
  const [payNow, setPayNow] = useState("");
  const [method, setMethod] = useState("cash");
  const [installments, setInstallments] = useState(0);
  const [recall, setRecall] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const handled = useRef(state);

  useEffect(() => {
    if (state.invoiceNumber && handled.current !== state) {
      setOpen(false);
      setQty({});
      setPicked([]);
      toast(`Receipt ${state.invoiceNumber} issued`);
      router.push(`${receiptsPath}/${state.invoiceNumber}`);
    }
    handled.current = state;
  }, [state, toast, router, receiptsPath]);

  const mine = planItems.filter((item) => item.patientId === patientId);
  const chosenServices = services.filter((service) => (qty[service.id] ?? 0) > 0);
  const chosenPlan = mine.filter((item) => picked.includes(item.id));
  const saved = discounts.find((discount) => discount.id === savedId);

  const rule: DiscountRule = useMemo(() => {
    if (discountType === "senior_citizen" || discountType === "pwd") return { kind: "statutory", label: STATUTORY_LABELS[discountType] };
    if (discountType === "saved" && saved) return saved.kind === "percent" ? { kind: "percent", percent: saved.value, label: saved.name } : { kind: "fixed", cents: saved.value, label: saved.name };
    if (discountType === "custom") {
      const parsed = parseDiscountAmount(customKind, customValue);
      if (!("error" in parsed)) return customKind === "percent" ? { kind: "percent", percent: parsed.value, label: "Discount" } : { kind: "fixed", cents: parsed.value, label: "Discount" };
    }
    return { kind: "none" };
  }, [discountType, saved, customKind, customValue]);

  const totals = invoiceTotalsFor([
    ...chosenServices.map((s) => ({ unitPriceCents: s.priceCentavos, quantity: qty[s.id], vatExempt: s.vatExempt })),
    ...chosenPlan.map((item) => ({ unitPriceCents: item.unitPriceCents, quantity: item.quantity, vatExempt: item.vatExempt })),
  ], rule);

  const paidNowCents = payNow === "" ? totals.totalCents : Math.min(Math.max(0, toCents(payNow) || 0), totals.totalCents);
  const balance = totals.totalCents - paidNowCents;
  const needsId = discountType === "senior_citizen" || discountType === "pwd" || (discountType === "saved" && saved?.requiresId);
  const errors = state.fieldErrors ?? {};
  const empty = chosenServices.length === 0 && chosenPlan.length === 0;
  const phases = [...new Set(mine.map((item) => item.phase))].sort();

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        <Receipt aria-hidden="true" className="size-4" /> New checkout
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="New checkout" placement="right">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="New checkout" subtitle="Pay in full, in part, or put the rest on account." onClose={() => setOpen(false)} />
          <input type="hidden" name="lines" value={JSON.stringify(chosenServices.map((s) => ({ serviceId: s.id, quantity: qty[s.id] })))} />
          <input type="hidden" name="planItemIds" value={JSON.stringify(chosenPlan.map((item) => item.id))} />
          <input type="hidden" name="payNow" value={payNow} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="co-patient" label="Patient" error={errors.patientId?.[0]}>
              <select id="co-patient" name="patientId" required value={patientId} onChange={(event) => { setPatientId(event.target.value); setPicked([]); }} className={CONSOLE_INPUT}>
                <option value="" disabled>Choose a patient</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.label}</option>)}
              </select>
            </FormField>

            {mine.length > 0 && (
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-xs font-semibold">From the treatment plan</legend>
                {phases.map((phase) => (
                  <div key={phase} className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold tracking-widest text-console-subtle uppercase">Phase {phase}</p>
                    {mine.filter((item) => item.phase === phase).map((item) => (
                      <label key={item.id} className="flex items-center gap-2.5 rounded-lg border border-console-line px-3 py-2 text-[13px]">
                        <input type="checkbox" checked={picked.includes(item.id)} onChange={(event) => setPicked((current) => (event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)))} className="size-4 shrink-0 accent-[var(--color-console-accent)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{item.description}{item.tooth ? ` · #${item.tooth}${item.surfaces ? ` (${item.surfaces})` : ""}` : ""}</span>
                          <span className="text-console-muted">{item.planTitle} · {item.status === "done" ? "done" : "planned"}</span>
                        </span>
                        <span className="shrink-0 font-data text-xs">{peso(item.unitPriceCents * item.quantity)}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </fieldset>
            )}

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-semibold">Services</legend>
              {services.length === 0 && <p className="text-[13px] text-console-muted">The price list is empty. Add services first.</p>}
              {services.map((service) => (
                <label key={service.id} className="flex items-center justify-between gap-3 rounded-lg border border-console-line px-3 py-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{service.name}</span>
                    <span className="text-console-muted">{peso(service.priceCentavos)}{service.vatExempt ? " · VAT-exempt" : ""}</span>
                  </span>
                  <input
                    type="number" min={0} max={99} inputMode="numeric" aria-label={`Quantity of ${service.name}`} value={qty[service.id] ?? 0}
                    onChange={(event) => setQty((current) => ({ ...current, [service.id]: Math.max(0, Math.min(99, Number(event.target.value) || 0)) }))}
                    className={`${CONSOLE_INPUT} w-16 text-center`}
                  />
                </label>
              ))}
              {errors.lines?.[0] && <p role="alert" className="text-xs text-console-danger">{errors.lines[0]}</p>}
            </fieldset>

            <div className="flex flex-col gap-3 rounded-lg border border-console-line p-3">
              <FormField id="co-discount" label="Discount">
                <select id="co-discount" name="discountType" value={discountType} onChange={(event) => { setDiscountType(event.target.value); setSavedId(""); }} className={CONSOLE_INPUT}>
                  <option value="none">No discount</option>
                  <option value="senior_citizen">Senior citizen (20%, VAT-exempt)</option>
                  <option value="pwd">PWD (20%, VAT-exempt)</option>
                  {discounts.length > 0 && <option value="saved">Clinic discount…</option>}
                  {canCustomDiscount && <option value="custom">Other (write your own)…</option>}
                </select>
              </FormField>
              {discountType === "saved" && (
                <FormField id="co-saved" label="Which discount" error={errors.savedId?.[0]}>
                  <select id="co-saved" name="savedDiscountId" value={savedId} onChange={(event) => setSavedId(event.target.value)} className={CONSOLE_INPUT}>
                    <option value="" disabled>Choose</option>
                    {discounts.map((discount) => <option key={discount.id} value={discount.id}>{discount.name} · {describeDiscount(discount.kind, discount.value)}</option>)}
                  </select>
                </FormField>
              )}
              {discountType === "custom" && (
                <>
                  <FormField id="co-label" label="Describe it" hint="Shown on the receipt" error={errors.label?.[0]}>
                    <input id="co-label" name="discountLabel" maxLength={60} placeholder="e.g. Employee discount" className={CONSOLE_INPUT} />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField id="co-kind" label="Type">
                      <select id="co-kind" name="customKind" value={customKind} onChange={(event) => setCustomKind(event.target.value as "percent" | "fixed")} className={CONSOLE_INPUT}>
                        <option value="percent">Percent off</option>
                        <option value="fixed">Peso amount off</option>
                      </select>
                    </FormField>
                    <FormField id="co-value" label={customKind === "percent" ? "Percent" : "Amount (₱)"} error={errors.customValue?.[0]}>
                      <input id="co-value" name="customValue" inputMode="decimal" value={customValue} onChange={(event) => setCustomValue(event.target.value)} className={CONSOLE_INPUT} />
                    </FormField>
                  </div>
                </>
              )}
              {needsId && (
                <FormField id="co-discount-id" label={discountType === "saved" ? "ID number" : "Senior / PWD ID number"} error={errors.idNumber?.[0]}>
                  <input id="co-discount-id" name="discountIdNumber" autoComplete="off" maxLength={40} className={CONSOLE_INPUT} />
                </FormField>
              )}
            </div>

            <dl className="rounded-lg bg-console-hover/60 p-3 text-[13px]">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(totals.subtotalCents)}</dd></div>
              {totals.vatExemptCents > 0 && <div className="flex justify-between"><dt>Less VAT (exempt sale)</dt><dd>−{peso(totals.vatExemptCents)}</dd></div>}
              {totals.discountCents > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>−{peso(totals.discountCents)}</dd></div>}
              <div className="mt-1 flex justify-between border-t border-console-line pt-1 text-sm font-extrabold"><dt>Total</dt><dd>{peso(totals.totalCents)}</dd></div>
            </dl>

            <div className="flex flex-col gap-3 rounded-lg border border-console-line p-3">
              <FormField id="co-paynow" label="Paying now (₱)" hint={`Leave empty to pay all ${peso(totals.totalCents)}`} error={errors.payNow?.[0]}>
                <div className="flex gap-2">
                  <input id="co-paynow" inputMode="decimal" value={payNow} onChange={(event) => setPayNow(event.target.value)} placeholder={String(totals.totalCents / 100)} className={`${CONSOLE_INPUT} font-data`} />
                  <ConsoleButton type="button" onClick={() => setPayNow("0")}>Pay later</ConsoleButton>
                </div>
              </FormField>
              {paidNowCents > 0 && (
                <>
                  <FormField id="co-method" label="Paid by" error={errors.method?.[0]}>
                    <select id="co-method" name="method" value={method} onChange={(event) => setMethod(event.target.value)} className={CONSOLE_INPUT}>
                      {PAYMENT_METHODS.map((key) => <option key={key} value={key}>{PAYMENT_LABELS[key]}</option>)}
                    </select>
                  </FormField>
                  {method !== "cash" && (
                    <FormField id="co-ref" label="Reference number" error={errors.referenceNumber?.[0]}>
                      <input id="co-ref" name="referenceNumber" autoComplete="off" maxLength={60} className={CONSOLE_INPUT} />
                    </FormField>
                  )}
                </>
              )}
              {balance > 0 && (
                <>
                  <p className="rounded-md bg-console-warn/15 px-3 py-2 text-[13px] font-semibold">Balance on account: {peso(balance)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField id="co-inst" label="Installments" hint="Optional">
                      <select id="co-inst" name="installmentCount" value={installments} onChange={(event) => setInstallments(Number(event.target.value))} className={CONSOLE_INPUT}>
                        <option value={0}>No schedule</option>
                        {INSTALLMENT_CHOICES.map((count) => <option key={count} value={count}>{count} monthly</option>)}
                      </select>
                    </FormField>
                    {installments > 0 && (
                      <FormField id="co-due" label="First due" error={errors.firstDueOn?.[0]}>
                        <input id="co-due" name="firstDueOn" type="date" min={today} className={CONSOLE_INPUT} />
                      </FormField>
                    )}
                  </div>
                  {installments > 0 && <p className="text-xs text-console-muted">About {peso(Math.floor(balance / installments))} a month.</p>}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-console-line p-3">
              <label className="flex items-start gap-2.5 text-[13px]">
                <input type="checkbox" checked={recall} onChange={(event) => setRecall(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]" />
                <span><strong>Remind them to come back.</strong> Optional. It only adds them to the recall list; nothing is booked.</span>
              </label>
              {recall && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField id="co-recall-months" label="In">
                    <select id="co-recall-months" name="recallMonths" defaultValue={6} className={CONSOLE_INPUT}>
                      {[1, 3, 6, 12].map((months) => <option key={months} value={months}>{months} {months === 1 ? "month" : "months"}</option>)}
                    </select>
                  </FormField>
                  <FormField id="co-recall-reason" label="For">
                    <input id="co-recall-reason" name="recallReason" maxLength={80} defaultValue="Cleaning and check-up" className={CONSOLE_INPUT} />
                  </FormField>
                </div>
              )}
            </div>

            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending || empty}>
              {pending ? "Saving…" : balance > 0 ? (paidNowCents > 0 ? `Take ${peso(paidNowCents)}, ${peso(balance)} on account` : "Put on account") : "Take payment"}
            </ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
