"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { CHART_CODES, PERMANENT_TEETH, SURFACES, guessChartCode, toothName } from "@/src/lib/dental-chart";
import { itemTotal } from "@/src/lib/plan-totals";
import {
  addPlanItemAction, cancelItemAction, createPlanAction, markItemDoneAction, markItemNotDoneAction, setPlanStatusAction, type DentalState,
} from "@/src/server/actions/dental";
import type { PlanItem, TreatmentPlan } from "@/src/server/services/treatment-plans";
import type { Tone } from "@/src/types/console";

const INITIAL: DentalState = {};
const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const money = (cents: number) => peso.format(cents / 100);
const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  proposed: { label: "Shown to patient", tone: "info" },
  accepted: { label: "Agreed", tone: "accent" },
  in_progress: { label: "In progress", tone: "warn" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export type PlanService = { id: string; name: string; priceCentavos: number };
type Rights = { canEdit: boolean; canAgree: boolean; canCustom: boolean };

/** A patient's treatment plans: phases of work with an estimate, agreed with the patient, then billed as it is done. */
export function TreatmentPlansPanel({ patientId, plans, services, canEdit, canAgree, canCustom, billingHref }: { patientId: string; plans: TreatmentPlan[]; services: PlanService[]; billingHref: string } & Rights) {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Treatment plans">{canEdit && <PlanDialog patientId={patientId} />}</PanelHeader>
      {plans.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[13px] text-console-muted">No treatment plans yet.</p>
      ) : (
        <ul className="divide-y divide-console-line">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} services={services} rights={{ canEdit, canAgree, canCustom }} billingHref={billingHref} />)}
        </ul>
      )}
    </Panel>
  );
}

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (action: (data: FormData) => Promise<{ message?: string }>, fields: Record<string, string>) =>
    start(async () => {
      const data = new FormData();
      for (const [key, value] of Object.entries(fields)) data.set(key, value);
      const result = await action(data);
      setError(result.message ?? "");
    });
  return { pending, error, run };
}

function PlanCard({ plan, services, rights, billingHref }: { plan: TreatmentPlan; services: PlanService[]; rights: Rights; billingHref: string }) {
  const { pending, error, run } = useRun();
  const status = STATUS[plan.status] ?? STATUS.draft;
  const open = plan.status !== "cancelled" && plan.status !== "completed";
  const phases = [...new Set([...plan.items.map((item) => item.phase), ...(plan.phaseLabels.length ? plan.phaseLabels.map((_, i) => i + 1) : [1])])].sort((a, b) => a - b);
  const step = (to: string, text: string, variant: "primary" | "secondary" | "danger" = "secondary") => (
    <ConsoleButton size="sm" variant={variant} disabled={pending} onClick={() => run(setPlanStatusAction, { planId: plan.id, status: to })}>{text}</ConsoleButton>
  );
  const { summary } = plan;

  return (
    <li className={`flex flex-col gap-3 px-3.5 py-3 ${plan.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[15px] font-extrabold">{plan.title}</h3>
        <Pill tone={status.tone}>{status.label}</Pill>
        <span className="ml-auto text-[13px] font-semibold tabular-nums">Estimate {money(summary.estimateCents)}</span>
      </div>
      <p className="text-[12px] text-console-muted">
        {summary.doneCount} of {summary.activeCount} done · {money(summary.billedCents)} billed · {money(summary.toBillCents)} still to bill
      </p>
      {plan.notes && <p className="text-[13px] text-console-muted">{plan.notes}</p>}

      {phases.map((phase) => {
        const items = plan.items.filter((item) => item.phase === phase);
        const label = plan.phaseLabels[phase - 1];
        const total = summary.byPhase.find((row) => row.phase === phase)?.totalCents ?? 0;
        if (items.length === 0 && !rights.canEdit) return null;
        return (
          <section key={phase} aria-label={`Phase ${phase}`} className="rounded-lg border border-console-line">
            <div className="flex items-center justify-between gap-2 border-b border-console-line bg-console-canvas px-3 py-1.5 text-[12px]">
              <span className="font-semibold">Phase {phase}{label ? ` · ${label}` : ""}</span>
              <span className="tabular-nums text-console-muted">{money(total)}</span>
            </div>
            {items.length === 0 ? <p className="px-3 py-3 text-[12px] text-console-muted">Nothing in this phase yet.</p> : (
              <ul className="divide-y divide-console-line">
                {items.map((item) => <ItemRow key={item.id} item={item} canEdit={rights.canEdit && open} />)}
              </ul>
            )}
          </section>
        );
      })}

      {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {rights.canEdit && open && <ItemDialog plan={plan} services={services} canCustom={rights.canCustom} />}
        {(rights.canEdit || rights.canAgree) && plan.status === "draft" && step("proposed", "Mark as shown to patient")}
        {(rights.canEdit || rights.canAgree) && (plan.status === "draft" || plan.status === "proposed") && step("accepted", "Patient agreed", "primary")}
        {rights.canEdit && plan.status === "accepted" && step("draft", "Back to draft")}
        {rights.canEdit && open && step("cancelled", "Cancel plan", "danger")}
        {billingHref && summary.toBillCents > 0 && plan.status !== "cancelled" && (
          <Link href={billingHref} className="inline-flex min-h-9 items-center rounded-lg border border-console-line px-3 text-[13px] font-semibold hover:bg-console-canvas focus-visible:outline-2 focus-visible:outline-console-accent">Bill from plan</Link>
        )}
      </div>
    </li>
  );
}

function ItemRow({ item, canEdit }: { item: PlanItem; canEdit: boolean }) {
  const { pending, error, run } = useRun();
  const done = item.status === "done";
  const cancelled = item.status === "cancelled";
  const act = (action: (data: FormData) => Promise<{ message?: string }>) => run(action, { itemId: item.id });
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px] ${cancelled ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${cancelled ? "line-through" : ""}`}>
          {item.description}{item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </p>
        <p className="text-[11px] text-console-subtle">
          {item.tooth ? `Tooth ${item.tooth} · ${toothName(item.tooth)}${item.surfaces ? ` · ${item.surfaces}` : ""}` : "No tooth"}
          {item.invoiceId ? " · Billed" : ""}
        </p>
        {error && <p role="alert" className="text-[11px] text-console-danger">{error}</p>}
      </div>
      <span className="tabular-nums">{money(itemTotal(item))}</span>
      {done ? <Pill tone="accent">Done</Pill> : cancelled ? <Pill tone="danger">Cancelled</Pill> : <Pill tone="neutral">Planned</Pill>}
      {canEdit && !cancelled && (
        <div className="flex gap-1.5">
          {done ? (
            <ConsoleButton size="sm" disabled={pending} onClick={() => act(markItemNotDoneAction)}>Undo</ConsoleButton>
          ) : (
            <>
              <ConsoleButton size="sm" variant="primary" disabled={pending} onClick={() => act(markItemDoneAction)}>Mark done</ConsoleButton>
              {!item.invoiceId && <ConsoleButton size="sm" variant="danger" disabled={pending} onClick={() => act(cancelItemAction)}>Remove</ConsoleButton>}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function PlanDialog({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPlanAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);
  const errors = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      toast("Plan created");
    }
    handled.current = state;
  }, [state, toast]);

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}><ClipboardList aria-hidden="true" className="size-4" /> New plan</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="New treatment plan">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="New treatment plan" subtitle="Name it, split it into phases if the work is staged, then add the items." onClose={() => setOpen(false)} />
          <input type="hidden" name="patientId" value={patientId} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="plan-title" label="Plan name" error={errors.title?.[0]}>
              <input id="plan-title" name="title" maxLength={100} placeholder="Full mouth rehabilitation" className={CONSOLE_INPUT} aria-invalid={errors.title ? true : undefined} />
            </FormField>
            <FormField id="plan-phases" label="Phase names (optional)" hint="One per line, e.g. Urgent, Restorative, Cosmetic. Leave empty for a single phase.">
              <textarea id="plan-phases" name="phaseLabels" rows={4} className={`${CONSOLE_INPUT} py-2`} />
            </FormField>
            <FormField id="plan-notes" label="Notes (optional)" error={errors.notes?.[0]}>
              <textarea id="plan-notes" name="notes" rows={3} maxLength={1000} className={`${CONSOLE_INPUT} py-2`} />
            </FormField>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Create plan"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}

function ItemDialog({ plan, services, canCustom }: { plan: TreatmentPlan; services: PlanService[]; canCustom: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addPlanItemAction, INITIAL);
  const [serviceId, setServiceId] = useState("");
  const [code, setCode] = useState("");
  const toast = useToast();
  const handled = useRef(state);
  const errors = state.fieldErrors ?? {};
  const phaseCount = Math.max(plan.phaseLabels.length, ...plan.items.map((item) => item.phase), 1);
  const custom = serviceId === "";

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      setOpen(false);
      setServiceId("");
      setCode("");
      toast("Added to the plan");
    }
    handled.current = state;
  }, [state, toast]);

  function pick(id: string) {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    setCode(service ? (guessChartCode(service.name) ?? "") : "");
  }

  return (
    <>
      <ConsoleButton size="sm" onClick={() => setOpen(true)}><Plus aria-hidden="true" className="size-3.5" /> Add item</ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Add plan item">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="Add to plan" subtitle={plan.title} onClose={() => setOpen(false)} />
          <input type="hidden" name="planId" value={plan.id} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="item-service" label="Service" hint="The price comes from the price list." error={errors.serviceId?.[0]}>
              <select id="item-service" name="serviceId" value={serviceId} onChange={(event) => pick(event.target.value)} className={CONSOLE_INPUT}>
                <option value="">{canCustom ? "Other work (custom price)…" : "Choose a service…"}</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {money(s.priceCentavos)}</option>)}
              </select>
            </FormField>
            {custom && canCustom && (
              <>
                <FormField id="item-description" label="Describe the work" error={errors.description?.[0]}>
                  <input id="item-description" name="description" maxLength={160} className={CONSOLE_INPUT} />
                </FormField>
                <FormField id="item-price" label="Price (₱)" error={errors.price?.[0]}>
                  <input id="item-price" name="price" inputMode="decimal" className={CONSOLE_INPUT} />
                </FormField>
              </>
            )}
            {custom && !canCustom && <p className="text-[12px] text-console-muted">Choose a service from the price list. Only the owner can add custom work.</p>}
            <div className="grid grid-cols-2 gap-3">
              <FormField id="item-phase" label="Phase" error={errors.phase?.[0]}>
                <select id="item-phase" name="phase" defaultValue="1" className={CONSOLE_INPUT}>
                  {Array.from({ length: Math.min(phaseCount + 1, 8) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}{plan.phaseLabels[n - 1] ? ` · ${plan.phaseLabels[n - 1]}` : ""}</option>)}
                </select>
              </FormField>
              <FormField id="item-quantity" label="Quantity" error={errors.quantity?.[0]}>
                <input id="item-quantity" name="quantity" type="number" min={1} max={32} defaultValue={1} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            <FormField id="item-tooth" label="Tooth (optional)" error={errors.tooth?.[0]}>
              <select id="item-tooth" name="tooth" defaultValue="" className={CONSOLE_INPUT}>
                <option value="">Whole mouth / not tooth-specific</option>
                {PERMANENT_TEETH.map((n) => <option key={n} value={n}>{n} · {toothName(n)}</option>)}
              </select>
            </FormField>
            <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
              <legend className="mb-1 text-xs font-semibold">Surfaces (fillings)</legend>
              {SURFACES.map((surface) => (
                <label key={surface} className="flex min-h-9 items-center gap-1.5 text-[13px]"><input type="checkbox" onChange={(event) => {
                  const input = document.getElementById("item-surfaces") as HTMLInputElement;
                  const set = new Set(input.value.split(""));
                  if (event.target.checked) set.add(surface); else set.delete(surface);
                  input.value = [...set].join("");
                }} className="size-4" /> {surface}</label>
              ))}
              <input id="item-surfaces" name="surfaces" type="hidden" defaultValue="" />
            </fieldset>
            <FormField id="item-code" label="When done, record on the tooth chart as" hint="Only used when a tooth is chosen." error={errors.chartCode?.[0]}>
              <select id="item-code" name="chartCode" value={code} onChange={(event) => setCode(event.target.value)} className={CONSOLE_INPUT}>
                <option value="">Nothing</option>
                {CHART_CODES.filter((c) => c.kind === "procedure").map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </FormField>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Adding…" : "Add item"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
