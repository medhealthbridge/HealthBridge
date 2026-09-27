"use client";

import { useState } from "react";
import { patientSchema } from "@/src/lib/schemas/patient";
import type { Patient, PatientDraft } from "@/src/types/clinix-app";
import { BottomSheet, SheetHeader } from "./bottom-sheet";

type PatientFormSheetProps = {
  open: boolean;
  /** Present when editing; absent when registering someone new. */
  editing: Patient | null;
  existing: Patient[];
  onSave: (draft: PatientDraft) => void;
  onClose: () => void;
};

const EMPTY: PatientDraft = {
  first: "",
  middle: "",
  last: "",
  suffix: "",
  sex: "F",
  age: "",
  mobile: "",
  philhealth: "",
  oscaId: "",
  allergies: "",
  notes: "",
};

function draftOf(patient: Patient | null): PatientDraft {
  if (!patient) return EMPTY;
  const { first, middle, last, suffix, sex, age, mobile, philhealth, oscaId, allergies, notes } = patient;
  return { first, middle, last, suffix, sex, age, mobile, philhealth, oscaId, allergies, notes };
}

const digitsOf = (mobile: string) => mobile.replace(/\D/g, "");

export function PatientFormSheet({ open, editing, existing, onSave, onClose }: PatientFormSheetProps) {
  const [draft, setDraft] = useState<PatientDraft>(() => draftOf(editing));
  const [errors, setErrors] = useState<Partial<Record<keyof PatientDraft, string>>>({});

  // Remount per open/target keeps the draft in step without an effect.
  const formKey = `${open}-${editing?.id ?? "new"}`;
  const [lastKey, setLastKey] = useState(formKey);
  if (lastKey !== formKey) {
    setLastKey(formKey);
    setDraft(draftOf(editing));
    setErrors({});
  }

  const duplicate = editing
    ? null
    : existing.find(
        (patient) => !patient.archived && digitsOf(patient.mobile) === digitsOf(draft.mobile) && draft.mobile.trim() !== "",
      );

  function set<K extends keyof PatientDraft>(field: K, value: PatientDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = patientSchema.safeParse(draft);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(flattened).map(([field, messages]) => [field, messages?.[0] ?? ""])),
      );
      return;
    }
    onSave({ ...parsed.data, allergies: parsed.data.allergies || "None on file" });
  }

  return (
    <BottomSheet open={open} title={editing ? "Edit patient" : "Register patient"} onClose={onClose}>
      <SheetHeader title={editing ? "Edit patient" : "Register patient"} onClose={onClose} />

      {duplicate ? (
        <p className="rounded-md bg-brand/10 px-3 py-2.5 text-[11.5px] text-brand-700">
          A patient with this mobile already exists: {duplicate.first} {duplicate.last} ({duplicate.id}).
        </p>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
        <div className="flex gap-2.5">
          <Field label="First name" error={errors.first} className="flex-1">
            <input className={INPUT} value={draft.first} onChange={(event) => set("first", event.target.value)} autoComplete="off" />
          </Field>
          <Field label="Middle" className="flex-1">
            <input className={INPUT} value={draft.middle} onChange={(event) => set("middle", event.target.value)} autoComplete="off" />
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Last name" error={errors.last} className="flex-[2]">
            <input className={INPUT} value={draft.last} onChange={(event) => set("last", event.target.value)} autoComplete="off" />
          </Field>
          <Field label="Suffix" className="flex-1">
            <input className={INPUT} value={draft.suffix} onChange={(event) => set("suffix", event.target.value)} placeholder="Jr." autoComplete="off" />
          </Field>
        </div>

        <div className="flex gap-2.5">
          <Field label="Sex" className="flex-1">
            <select className={INPUT} value={draft.sex} onChange={(event) => set("sex", event.target.value as "F" | "M")}>
              <option value="F">F</option>
              <option value="M">M</option>
            </select>
          </Field>
          <Field label="Age" error={errors.age} className="flex-1">
            <input className={INPUT} value={draft.age} onChange={(event) => set("age", event.target.value as PatientDraft["age"])} inputMode="numeric" />
          </Field>
        </div>

        <Field label="Mobile (+63 / 09XX)" error={errors.mobile}>
          <input className={INPUT} value={draft.mobile} onChange={(event) => set("mobile", event.target.value)} placeholder="0917 555 4412" inputMode="tel" />
        </Field>
        <Field label="PhilHealth PIN" error={errors.philhealth}>
          <input className={INPUT} value={draft.philhealth} onChange={(event) => set("philhealth", event.target.value)} placeholder="Optional" />
        </Field>
        <Field label="OSCA / PWD ID">
          <input className={INPUT} value={draft.oscaId} onChange={(event) => set("oscaId", event.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Allergies">
          <input className={INPUT} value={draft.allergies} onChange={(event) => set("allergies", event.target.value)} placeholder="None on file" />
        </Field>
        <Field label="Clinical notes">
          <input className={INPUT} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
        </Field>

        <button
          type="submit"
          className="mt-1 min-h-12 w-full cursor-pointer rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Save patient
        </button>
      </form>
    </BottomSheet>
  );
}

const INPUT =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand";

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      {children}
      {error ? <span className="text-[11px] font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}
