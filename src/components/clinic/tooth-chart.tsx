"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Box, LayoutGrid } from "lucide-react";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import {
  CHART_CODES, CODE_BY_KEY, PERMANENT_TEETH, SURFACES, SURFACE_LABELS, deriveToothStates, describeTooth, toothName, universalNumber, type ChartEntry,
} from "@/src/lib/dental-chart";
import { addChartEntryAction, voidChartEntryAction, type DentalState } from "@/src/server/actions/dental";
import type { ChartEntryRow } from "@/src/server/services/dental-chart";

const ToothChart3D = dynamic(() => import("./tooth-chart-3d").then((m) => m.ToothChart3D), {
  ssr: false,
  loading: () => <div className="grid h-[22rem] place-items-center rounded-lg bg-console-canvas text-[13px] text-console-muted sm:h-[28rem]">Loading 3D model…</div>,
});

const INITIAL: DentalState = {};
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const UPPER = PERMANENT_TEETH.slice(0, 16);
const LOWER = PERMANENT_TEETH.slice(16);

export type ToothPlanItem = { id: string; tooth: number; description: string; status: string; planTitle: string };

/** The patient's teeth: a 3D model to look around, a flat chart for quick tapping, and the history behind each tooth. */
export function ToothChartPanel({ patientId, entries, planItems, canWrite }: { patientId: string; entries: ChartEntryRow[]; planItems: ToothPlanItem[]; canWrite: boolean }) {
  const [view, setView] = useState<"3d" | "flat">("3d");
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const states = useMemo(() => {
    const live: ChartEntry[] = entries.map((e) => ({ id: e.id, tooth: e.tooth, surfaces: e.surfaces, kind: e.kind, code: e.code, occurredOn: e.occurredOn, createdAt: e.createdAt.toISOString(), voided: e.voided }));
    return deriveToothStates(live);
  }, [entries]);

  function failed() {
    setView("flat");
  }

  const label = hover ?? selected;
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Tooth chart">
        <div role="tablist" aria-label="Chart view" className="flex rounded-lg border border-console-line p-0.5 text-[12px] font-semibold">
          {([["3d", "3D", Box], ["flat", "Flat", LayoutGrid]] as const).map(([key, text, Icon]) => (
            <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`flex min-h-9 items-center gap-1 rounded-md px-2.5 focus-visible:outline-2 focus-visible:outline-console-accent ${view === key ? "bg-console-accent text-white" : "text-console-muted"}`}>
              <Icon aria-hidden="true" className="size-3.5" /> {text}
            </button>
          ))}
        </div>
      </PanelHeader>
      <div className="grid gap-4 p-3.5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-2">
          {view === "3d" ? (
            <div className="relative">
              <ToothChart3D states={states} selected={selected} onSelect={setSelected} onHover={setHover} onFail={failed} />
              <p className="pointer-events-none absolute top-2 left-2 rounded-md bg-console-panel/90 px-2 py-1 text-[11px] text-console-muted">
                {label ? <><span className="font-semibold text-console-ink">Tooth {label}</span> · {toothName(label)}</> : "Drag to turn · scroll or pinch to zoom · tap a tooth"}
              </p>
              <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-console-panel/90 px-2 py-1 text-[10px] text-console-subtle">Patient&rsquo;s right is on your left</p>
            </div>
          ) : (
            <FlatChart states={states} selected={selected} onSelect={setSelected} />
          )}
          <Legend />
        </div>
        <ToothDetail patientId={patientId} tooth={selected} entries={entries} planItems={planItems} canWrite={canWrite} state={selected ? states.get(selected) : undefined} onClose={() => setSelected(null)} onPick={setSelected} />
      </div>
    </Panel>
  );
}

function FlatChart({ states, selected, onSelect }: { states: ReturnType<typeof deriveToothStates>; selected: number | null; onSelect: (tooth: number) => void }) {
  const row = (teeth: readonly number[], name: string) => (
    <div role="group" aria-label={name} className="grid grid-cols-16 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(2.1rem, 1fr))" }}>
      {teeth.map((tooth) => {
        const state = states.get(tooth);
        const headline = state?.headline ? CODE_BY_KEY.get(state.headline) : null;
        return (
          <button
            key={tooth}
            onClick={() => onSelect(tooth)}
            aria-pressed={selected === tooth}
            aria-label={`Tooth ${tooth}, ${toothName(tooth)}: ${describeTooth(state)}`}
            className={`flex min-h-11 flex-col items-center justify-center rounded-md border text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-console-accent ${selected === tooth ? "border-console-accent ring-2 ring-console-accent/40" : "border-console-line"}`}
            style={headline ? { backgroundColor: `${headline.color}33`, borderColor: selected === tooth ? undefined : headline.color } : undefined}
          >
            {tooth}
            <span aria-hidden="true" className="mt-0.5 size-1.5 rounded-full" style={{ backgroundColor: headline?.color ?? "transparent" }} />
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[36rem] flex-col gap-2">
        {row(UPPER, "Upper teeth")}
        {row(LOWER, "Lower teeth")}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-console-muted" aria-label="Colour key">
      {CHART_CODES.filter((c) => c.code !== "extraction").map((c) => (
        <li key={c.code} className="flex items-center gap-1">
          <span aria-hidden="true" className="size-2.5 rounded-full border border-console-line" style={{ backgroundColor: c.color }} /> {c.label.replace(/ \(.*\)/, "")}
        </li>
      ))}
    </ul>
  );
}

function ToothDetail({ patientId, tooth, entries, planItems, canWrite, state, onClose, onPick }: { patientId: string; tooth: number | null; entries: ChartEntryRow[]; planItems: ToothPlanItem[]; canWrite: boolean; state: ReturnType<typeof deriveToothStates> extends Map<number, infer S> ? S | undefined : never; onClose: () => void; onPick: (tooth: number) => void }) {
  if (tooth === null) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-console-line p-3.5 text-[13px] text-console-muted">
        <p>Select a tooth to see its history{canWrite ? " and record a finding or procedure" : ""}.</p>
        {canWrite && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-console-ink">
            Or choose by number
            <select className={CONSOLE_INPUT} defaultValue="" onChange={(event) => event.target.value && onPick(Number(event.target.value))}>
              <option value="">Tooth…</option>
              {PERMANENT_TEETH.map((n) => <option key={n} value={n}>{n} · {toothName(n)}</option>)}
            </select>
          </label>
        )}
      </div>
    );
  }
  const history = entries.filter((e) => e.tooth === tooth).slice().reverse();
  const planned = planItems.filter((item) => item.tooth === tooth && item.status === "planned");
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-console-line p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-extrabold">Tooth {tooth}</h3>
          <p className="text-[12px] text-console-muted">{toothName(tooth)} · Universal #{universalNumber(tooth)}</p>
        </div>
        <ConsoleButton size="sm" onClick={onClose}>Close</ConsoleButton>
      </div>
      <p className="text-[13px] font-medium">{describeTooth(state)}</p>
      {planned.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] tracking-widest text-console-subtle uppercase">Planned</p>
          {planned.map((item) => <p key={item.id} className="text-[12px]">{item.description} <span className="text-console-subtle">· {item.planTitle}</span></p>)}
        </div>
      )}
      {canWrite && <AddEntryForm key={tooth} patientId={patientId} tooth={tooth} />}
      <div>
        <p className="mb-1 text-[10px] tracking-widest text-console-subtle uppercase">History</p>
        {history.length === 0 ? (
          <p className="text-[12px] text-console-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-console-line">
            {history.map((entry) => {
              const spec = CODE_BY_KEY.get(entry.code);
              return (
                <li key={entry.id} className={`flex flex-col gap-0.5 py-2 text-[12px] ${entry.voided ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: spec?.color }} />
                    <span className={`font-semibold ${entry.voided ? "line-through" : ""}`}>{spec?.label ?? entry.code}{entry.surfaces ? ` · ${entry.surfaces}` : ""}</span>
                    <Pill tone={entry.kind === "procedure" ? "accent" : "neutral"}>{entry.kind === "procedure" ? "Done" : "Finding"}</Pill>
                    {entry.voided && <Pill tone="danger">Voided</Pill>}
                  </div>
                  <p className="text-console-subtle">{dateFormat.format(new Date(`${entry.occurredOn}T00:00:00+08:00`))}{entry.authorName ? ` · ${entry.authorName}` : ""}</p>
                  {entry.note && <p className="text-console-muted">{entry.note}</p>}
                  {entry.voided && entry.voidReason && <p className="text-console-muted">Voided: {entry.voidReason}</p>}
                  {canWrite && !entry.voided && <VoidEntry entryId={entry.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddEntryForm({ patientId, tooth }: { patientId: string; tooth: number }) {
  const [state, action, pending] = useActionState(addChartEntryAction, INITIAL);
  const [code, setCode] = useState("filling");
  const toast = useToast();
  const handled = useRef(state);
  const formRef = useRef<HTMLFormElement>(null);
  const spec = CODE_BY_KEY.get(code);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.saved && handled.current !== state) {
      toast(state.saved);
      formRef.current?.reset();
    }
    handled.current = state;
  }, [state, toast]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2 rounded-lg bg-console-canvas p-2.5">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="tooth" value={tooth} />
      <FormField id={`chart-code-${tooth}`} label="Record" error={errors.code?.[0]}>
        <select id={`chart-code-${tooth}`} name="code" value={code} onChange={(event) => setCode(event.target.value)} className={CONSOLE_INPUT}>
          <optgroup label="Findings">{CHART_CODES.filter((c) => c.kind === "condition").map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</optgroup>
          <optgroup label="Work done">{CHART_CODES.filter((c) => c.kind === "procedure").map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</optgroup>
        </select>
      </FormField>
      {spec?.surfaces && (
        <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
          <legend className="mb-1 text-xs font-semibold">Surfaces</legend>
          {SURFACES.map((surface) => (
            <label key={surface} className="flex min-h-9 items-center gap-1.5 text-[13px]">
              <input type="checkbox" name="surfaces" value={surface} className="size-4" /> {surface}<span className="sr-only"> {SURFACE_LABELS[surface]}</span>
            </label>
          ))}
        </fieldset>
      )}
      <FormField id={`chart-note-${tooth}`} label="Note (optional)" error={errors.note?.[0]}>
        <input id={`chart-note-${tooth}`} name="note" maxLength={300} className={CONSOLE_INPUT} />
      </FormField>
      {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
      <ConsoleButton type="submit" variant="primary" disabled={pending}>{pending ? "Saving…" : "Add to chart"}</ConsoleButton>
    </form>
  );
}

function VoidEntry({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();

  function apply() {
    const data = new FormData();
    data.set("entryId", entryId);
    data.set("reason", reason);
    start(async () => {
      const result = await voidChartEntryAction(data);
      if (result.message) return setError(result.message);
      setOpen(false);
      toast("Entry voided");
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="min-h-9 w-fit text-[12px] font-semibold text-console-danger focus-visible:outline-2 focus-visible:outline-console-accent">Void entry</button>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Void chart entry" placement="center">
        <div className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-base font-extrabold">Void this entry?</h2>
          <p className="text-[13px] text-console-muted">The tooth goes back to how it was before. The entry stays in the history with your reason.</p>
          <FormField id={`void-entry-${entryId}`} label="Reason" error={error || undefined}>
            <input id={`void-entry-${entryId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} className={CONSOLE_INPUT} />
          </FormField>
          <div className="flex justify-end gap-2">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton variant="danger" onClick={apply} disabled={pending}>{pending ? "Voiding…" : "Void entry"}</ConsoleButton>
          </div>
        </div>
      </ConsoleDialog>
    </>
  );
}
