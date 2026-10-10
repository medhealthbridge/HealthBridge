"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Box, Copy, LayoutPanelTop, Sparkles } from "lucide-react";
import { Panel, PanelHeader } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import {
  CHART_CODES, CODE_BY_KEY, PERMANENT_TEETH, PRIMARY_TEETH, SURFACES, SURFACE_LABELS, deriveToothStates, describeTooth, isPrimary, toothName, universalLabel, type ChartEntry, type ToothState,
} from "@/src/lib/dental-chart";
import { draftSoapNote, soapAsText } from "@/src/lib/dental-soap";
import { addChartEntryAction, voidChartEntryAction, type DentalState } from "@/src/server/actions/dental";
import type { ChartEntryRow } from "@/src/server/services/dental-chart";
import { NoteDialog } from "./note-dialog";
import { ToothGlyph, ToothGlyphDefs, glyphSize } from "./tooth-glyph";

const ToothChart3D = dynamic(() => import("./tooth-chart-3d").then((m) => m.ToothChart3D), {
  ssr: false,
  loading: () => <div className="grid h-[22rem] place-items-center rounded-lg bg-console-canvas text-[13px] text-console-muted sm:h-[28rem]">Loading 3D model…</div>,
});

const INITIAL: DentalState = {};
const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const UPPER = PERMANENT_TEETH.slice(0, 16);
const LOWER = PERMANENT_TEETH.slice(16);
const UPPER_PRIMARY = PRIMARY_TEETH.slice(0, 10);
const LOWER_PRIMARY = PRIMARY_TEETH.slice(10);

/** The word under a tooth, from its most important finding. */
const SHORT: Record<string, string> = {
  caries: "Caries", filling: "Filled", crown: "Crown", missing: "Missing", rct: "RCT", bridge: "Bridge", implant: "Implant", impacted: "Impacted",
  fracture: "Fractured", periapical: "Abscess", veneer: "Veneer", sealant: "Sealant", mobility: "Mobile", watch: "Watch", extraction: "Extracted",
};

type Dentition = "adult" | "child" | "mixed";
const DENTITIONS: [Dentition, string][] = [["adult", "Adult"], ["child", "Child"], ["mixed", "Mixed"]];

function defaultDentition(age: number | null, entries: ChartEntryRow[]): Dentition {
  if (age !== null) return age < 6 ? "child" : age < 13 ? "mixed" : "adult";
  return entries.some((e) => isPrimary(e.tooth)) ? "mixed" : "adult";
}

export type ToothPlanItem = { id: string; tooth: number; description: string; status: string; planTitle: string };

/**
 * The patient's teeth as a dental chart: each tooth drawn with its crown and roots, findings painted where they are,
 * a word under every affected tooth, and a draft SOAP note written from the chart. A 3D view is a second tab.
 */
export function ToothChartPanel({ patientId, entries, planItems, canWrite, age = null }: { patientId: string; entries: ChartEntryRow[]; planItems: ToothPlanItem[]; canWrite: boolean; age?: number | null }) {
  const [view, setView] = useState<"chart" | "3d">("chart");
  const [dentition, setDentition] = useState<Dentition>(() => defaultDentition(age, entries));
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const states = useMemo(() => {
    const live: ChartEntry[] = entries.map((e) => ({ id: e.id, tooth: e.tooth, surfaces: e.surfaces, kind: e.kind, code: e.code, occurredOn: e.occurredOn, createdAt: e.createdAt.toISOString(), voided: e.voided }));
    return deriveToothStates(live);
  }, [entries]);
  const affected = [...states.entries()].filter(([, s]) => s.headline).sort(([a], [b]) => a - b);
  const planned = planItems.filter((item) => item.status === "planned");
  const label = hover ?? selected;

  return (
    <Panel className="min-w-0 lg:col-span-2">
      <PanelHeader title="Tooth chart">
        <div className="flex flex-wrap items-center gap-2">
          {view === "chart" && <Segmented label="Dentition" value={dentition} options={DENTITIONS} onChange={setDentition} />}
          <Segmented label="View" value={view} options={[["chart", "Chart"], ["3d", "3D"]]} onChange={setView} icons={{ chart: LayoutPanelTop, "3d": Box }} />
        </div>
      </PanelHeader>
      <ToothGlyphDefs />
      <div className="flex flex-col gap-4 p-3.5">
        <Legend focus={focus} onFocus={setFocus} />
        {view === "chart" ? (
          <ArchChart dentition={dentition} states={states} selected={selected} focus={focus} onSelect={setSelected} />
        ) : (
          <div className="relative">
            <ToothChart3D states={states} selected={selected} onSelect={setSelected} onHover={setHover} onFail={() => setView("chart")} />
            <p className="pointer-events-none absolute top-2 left-2 rounded-md bg-console-panel/90 px-2 py-1 text-[11px] text-console-muted">
              {label ? <><span className="font-semibold text-console-ink">Tooth {label}</span> · {toothName(label)}</> : "Drag to turn · scroll or pinch to zoom · tap a tooth"}
            </p>
          </div>
        )}

        <section aria-label="Affected teeth" className="rounded-lg border border-console-line bg-console-canvas/60 px-3 py-2.5">
          <p className="mb-2 text-[11px] font-semibold text-console-muted">Affected teeth</p>
          {affected.length === 0 ? (
            <p className="text-[12px] text-console-subtle">Nothing charted yet{canWrite ? ". Tap a tooth to record a finding." : "."}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {affected.map(([tooth, state]) => {
                const color = CODE_BY_KEY.get(state.headline!)?.color;
                return (
                  <button key={tooth} onClick={() => setSelected(tooth)} aria-pressed={selected === tooth} className="flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold text-console-ink focus-visible:outline-2 focus-visible:outline-console-accent" style={{ borderColor: `${color}99`, backgroundColor: `${color}1f` }}>
                    {/* Colour marks the finding; the text stays ink so it is readable on any tint. */}
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    #{tooth}: {describeTooth(state)}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <ToothDetail patientId={patientId} tooth={selected} entries={entries} planItems={planItems} canWrite={canWrite} state={selected ? states.get(selected) : undefined} onClose={() => setSelected(null)} onPick={setSelected} withPrimary={dentition !== "adult"} />
          <SoapDraftCard patientId={patientId} states={states} planned={planned} canWrite={canWrite} />
        </div>
      </div>
    </Panel>
  );
}

function Segmented<T extends string>({ label, value, options, onChange, icons }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void; icons?: Record<string, typeof Box> }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-console-line p-0.5 text-[12px] font-semibold">
      {options.map(([key, text]) => {
        const Icon = icons?.[key as string];
        return (
          <button key={key} role="radio" aria-checked={value === key} onClick={() => onChange(key)} className={`flex min-h-9 items-center gap-1 rounded-md px-2.5 focus-visible:outline-2 focus-visible:outline-console-accent ${value === key ? "bg-console-accent text-white" : "text-console-muted hover:text-console-ink"}`}>
            {Icon && <Icon aria-hidden="true" className="size-3.5" />} {text}
          </button>
        );
      })}
    </div>
  );
}

function ArchChart({ dentition, states, selected, focus, onSelect }: { dentition: Dentition; states: Map<number, ToothState>; selected: number | null; focus: string | null; onSelect: (tooth: number) => void }) {
  const permanentWidth = UPPER.reduce((sum, t) => sum + glyphSize(t).width + 14, 0);
  const primaryShare = (teeth: readonly number[]) => `${(teeth.reduce((sum, t) => sum + glyphSize(t).width + 14, 0) / permanentWidth) * 100}%`;
  const row = (teeth: readonly number[], name: string, upper: boolean, width = "100%") => (
    <div role="group" aria-label={name} className="mx-auto grid items-end gap-x-0.5" style={{ width, gridTemplateColumns: teeth.map((t) => `${glyphSize(t).width + 14}fr`).join(" ") }}>
      {teeth.map((tooth) => <ToothCell key={tooth} tooth={tooth} state={states.get(tooth)} selected={selected === tooth} dimmed={!!focus && !hasCode(states.get(tooth), focus)} onSelect={onSelect} upper={upper} />)}
    </div>
  );
  const showPermanent = dentition !== "child";
  const showPrimary = dentition !== "adult";
  return (
    // On a phone the arches keep a readable size and scroll sideways inside the chart; the page itself never scrolls sideways.
    <div className="overflow-x-auto rounded-xl bg-console-canvas/60 py-3">
    <div className="flex min-w-[42rem] flex-col gap-1 px-2 sm:min-w-0 sm:px-4">
      <p className="text-[11px] font-semibold text-console-muted sm:text-center">Upper arch (maxillary){dentition === "mixed" ? " · permanent and baby" : dentition === "child" ? " · baby teeth" : ""}</p>
      {showPermanent && row(UPPER, "Upper permanent teeth", true)}
      {showPrimary && row(UPPER_PRIMARY, "Upper baby teeth", true, showPermanent ? primaryShare(UPPER_PRIMARY) : "100%")}
      <div aria-hidden="true" className="my-1 flex items-center gap-2 px-2 text-[10px] font-semibold text-console-subtle">
        <span>R</span><span className="h-px flex-1 border-t border-dashed border-console-line" /><span>patient&rsquo;s right · left</span><span className="h-px flex-1 border-t border-dashed border-console-line" /><span>L</span>
      </div>
      {showPrimary && row(LOWER_PRIMARY, "Lower baby teeth", false, showPermanent ? primaryShare(LOWER_PRIMARY) : "100%")}
      {showPermanent && row(LOWER, "Lower permanent teeth", false)}
      <p className="text-[11px] font-semibold text-console-muted sm:text-center">Lower arch (mandibular)<span className="font-normal text-console-subtle sm:hidden"> · swipe sideways for all teeth</span></p>
    </div>
    </div>
  );
}

function hasCode(state: ToothState | undefined, code: string) {
  if (!state) return false;
  const map: Record<string, boolean> = {
    caries: !!state.caries, filling: !!state.filling, sealant: !!state.sealant, watch: !!state.watch, crown: state.crown, veneer: state.veneer, bridge: state.bridge,
    rct: state.rct, implant: state.implant, missing: state.missing && !state.implant, extraction: state.missing, fracture: state.fracture, periapical: state.lesion, mobility: state.mobile, impacted: state.impacted,
  };
  return !!map[code];
}

function ToothCell({ tooth, state, selected, dimmed, onSelect, upper }: { tooth: number; state: ToothState | undefined; selected: boolean; dimmed: boolean; onSelect: (tooth: number) => void; upper: boolean }) {
  const headline = state?.headline ? CODE_BY_KEY.get(state.headline) : undefined;
  const color = headline?.color;
  const glyph = <ToothGlyph tooth={tooth} state={state} className={`w-full ${isPrimary(tooth) ? "h-[4.5rem] sm:h-[5.5rem]" : "h-28 sm:h-32"}`} />;
  return (
    <button
      onClick={() => onSelect(tooth)}
      aria-pressed={selected}
      aria-label={`Tooth ${tooth}, ${toothName(tooth)}: ${describeTooth(state)}`}
      title={`${tooth} · ${toothName(tooth)} — ${describeTooth(state)}`}
      className={`group flex min-w-0 flex-col items-center rounded-lg border px-px pt-1 pb-1 transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-console-accent ${selected ? "ring-2 ring-console-accent" : ""} ${dimmed ? "opacity-30" : ""} ${color ? "" : "border-transparent hover:bg-console-panel"}`}
      style={color ? { backgroundColor: `${color}22`, borderColor: `${color}88` } : undefined}
    >
      {upper ? glyph : null}
      <span className={`mt-0.5 text-[10px] tabular-nums sm:text-[11px] ${color ? "font-extrabold text-console-ink" : "font-semibold text-console-muted"}`}>{tooth}</span>
      <span className="block h-3.5 truncate text-[9px] leading-3.5 font-bold text-console-ink">{headline ? SHORT[headline.code] ?? headline.label : ""}</span>
      {upper ? null : <div className="order-first w-full">{glyph}</div>}
    </button>
  );
}

function Legend({ focus, onFocus }: { focus: string | null; onFocus: (code: string | null) => void }) {
  return (
    <div role="group" aria-label="Colour key — tap one to show only those teeth" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      <button onClick={() => onFocus(null)} aria-pressed={focus === null} className={`min-h-8 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-console-accent ${focus === null ? "border-console-accent bg-console-accent/10 text-console-ink" : "border-console-line text-console-muted"}`}>All teeth</button>
      {CHART_CODES.filter((c) => c.code !== "extraction").map((c) => (
        <button key={c.code} onClick={() => onFocus(focus === c.code ? null : c.code)} aria-pressed={focus === c.code} className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] focus-visible:outline-2 focus-visible:outline-console-accent ${focus === c.code ? "border-console-ink text-console-ink" : "border-transparent text-console-muted hover:text-console-ink"}`}>
          <span aria-hidden="true" className="size-2.5 rounded-full border border-black/10" style={{ backgroundColor: c.color }} /> {SHORT[c.code] ?? c.label}
        </button>
      ))}
    </div>
  );
}

const SOAP_ROWS = [["subjective", "S", "Subjective", "#d97706"], ["objective", "O", "Objective", "#059669"], ["assessment", "A", "Assessment", "#0284c7"], ["plan", "P", "Plan", "#7c3aed"]] as const;

/** A draft visit note written from the chart. Nothing is saved until the dentist edits and saves it as a note. */
function SoapDraftCard({ patientId, states, planned, canWrite }: { patientId: string; states: Map<number, ToothState>; planned: ToothPlanItem[]; canWrite: boolean }) {
  const toast = useToast();
  const draft = useMemo(() => draftSoapNote(states, planned.map((p) => ({ tooth: p.tooth, description: p.description }))), [states, planned]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(soapAsText(draft));
      toast("Copied");
    } catch {
      toast("Couldn't copy on this device");
    }
  }
  return (
    <section aria-label="Draft SOAP note" className="flex flex-col gap-2.5 rounded-lg border border-console-line p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-console-ink uppercase"><Sparkles aria-hidden="true" className="size-4 text-console-accent" /> Draft SOAP note</h3>
        <div className="flex gap-1.5">
          <ConsoleButton size="sm" onClick={copy}><Copy aria-hidden="true" className="size-3.5" /> Copy</ConsoleButton>
          {canWrite && <NoteDialog mode="new" patientId={patientId} seed={draft} label="Use as note" />}
        </div>
      </div>
      <dl className="flex flex-col gap-1.5 text-[13px]">
        {SOAP_ROWS.map(([key, letter, name, color]) => (
          <div key={key}>
            <dt className="inline font-bold" style={{ color }}>{letter} — {name}: </dt>
            <dd className="inline">{draft[key]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-console-subtle">Written from the chart and treatment plan. Review it before saving; nothing is saved automatically.</p>
    </section>
  );
}

function ToothDetail({ patientId, tooth, entries, planItems, canWrite, state, onClose, onPick, withPrimary }: { patientId: string; tooth: number | null; entries: ChartEntryRow[]; planItems: ToothPlanItem[]; canWrite: boolean; state: ToothState | undefined; onClose: () => void; onPick: (tooth: number) => void; withPrimary: boolean }) {
  if (tooth === null) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-console-line p-3.5 text-[13px] text-console-muted">
        <p>Select a tooth to see its history{canWrite ? " and record a finding or procedure" : ""}.</p>
        {canWrite && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-console-ink">
            Or choose by number
            <select className={CONSOLE_INPUT} defaultValue="" onChange={(event) => event.target.value && onPick(Number(event.target.value))}>
              <option value="">Tooth…</option>
              <optgroup label="Permanent">{PERMANENT_TEETH.map((n) => <option key={n} value={n}>{n} · {toothName(n)}</option>)}</optgroup>
              {withPrimary && <optgroup label="Baby teeth">{PRIMARY_TEETH.map((n) => <option key={n} value={n}>{n} · {toothName(n)}</option>)}</optgroup>}
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
          <p className="text-[12px] text-console-muted">{toothName(tooth)} · Universal #{universalLabel(tooth)}</p>
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
