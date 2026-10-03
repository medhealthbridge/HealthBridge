"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { useToast } from "@/src/components/console/toast";
import { addSuggestedFieldsAction, copyFieldsAction, moveFieldAction } from "@/src/server/actions/patient-fields";

export function MoveButtons({ id, label, first, last }: { id: string; label: string; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const move = (direction: "up" | "down") => {
    const data = new FormData();
    data.set("id", id);
    data.set("direction", direction);
    start(async () => {
      await moveFieldAction(data);
    });
  };
  return (
    <div className="flex gap-1">
      <ConsoleButton size="sm" disabled={pending || first} onClick={() => move("up")} aria-label={`Move ${label} up`}><ArrowUp aria-hidden="true" className="size-3.5" /></ConsoleButton>
      <ConsoleButton size="sm" disabled={pending || last} onClick={() => move("down")} aria-label={`Move ${label} down`}><ArrowDown aria-hidden="true" className="size-3.5" /></ConsoleButton>
    </div>
  );
}

/** One click adds the picked suggestions as the clinic's own fields. */
export function SuggestionPicker({ suggestions }: { suggestions: { label: string; detail: string; medical: boolean }[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  if (suggestions.length === 0) return <p className="text-[13px] text-console-muted">You already have every suggestion for your clinic type.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <li key={suggestion.label}>
            <label className="flex min-h-11 items-start gap-2.5 rounded-lg border border-console-line px-3 py-2 text-[13px]">
              <input
                type="checkbox"
                checked={picked.includes(suggestion.label)}
                onChange={(event) => setPicked((current) => (event.target.checked ? [...current, suggestion.label] : current.filter((label) => label !== suggestion.label)))}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-console-accent)]"
              />
              <span>
                <span className="block font-semibold">{suggestion.label}</span>
                <span className="text-[11px] text-console-muted">{suggestion.detail}{suggestion.medical ? " · Medical" : ""}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
      <div>
        <ConsoleButton
          variant="primary"
          disabled={pending || picked.length === 0}
          onClick={() => {
            const data = new FormData();
            picked.forEach((label) => data.append("label", label));
            start(async () => {
              const result = await addSuggestedFieldsAction(data);
              if (result.message) return setError(result.message);
              setError("");
              setPicked([]);
              toast(`Added ${result.added} ${result.added === 1 ? "field" : "fields"}`);
            });
          }}
        >
          {pending ? "Adding…" : `Add ${picked.length || ""} selected`.trim()}
        </ConsoleButton>
      </div>
    </div>
  );
}

/** Use another branch's standard fields as a template. Fields this branch already has are skipped. */
export function CopyFromBranch({ branches }: { branches: { id: string; name: string }[] }) {
  const [source, setSource] = useState(branches[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Copy from branch
        <select value={source} onChange={(event) => setSource(event.target.value)} className={CONSOLE_INPUT}>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </label>
      <ConsoleButton
        disabled={pending || !source}
        onClick={() => {
          const data = new FormData();
          data.set("sourceClinicId", source);
          start(async () => {
            const result = await copyFieldsAction(data);
            if (result.message) return setError(result.message);
            setError("");
            toast(result.added ? `Copied ${result.added} ${result.added === 1 ? "field" : "fields"}` : "Nothing new to copy");
          });
        }}
      >
        {pending ? "Copying…" : "Copy fields"}
      </ConsoleButton>
      {error && <p role="alert" className="w-full text-xs text-console-danger">{error}</p>}
    </div>
  );
}
