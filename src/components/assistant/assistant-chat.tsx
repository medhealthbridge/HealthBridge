"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { PANEL } from "@/src/components/console/panel";
import { PasswordInput } from "@/src/components/password-input";

type Proposal = { id: string; summary: string; stepUp?: "none" | "unlock" | "password+typed"; phrase?: string };
type Turn = { role: "user" | "assistant"; content: string; by?: string; proposals?: Proposal[] };
type Usage = { aiCalls: number; ruleAnswers: number; tokens: number; limit: number };

const BY_LABEL: Record<string, string> = { rules: "Instant answer", gemini: "Gemini", anthropic: "Claude" };

type AssistantChatProps = {
  /** POST endpoint for a question, and for confirm/cancel of a prepared change. */
  endpoint: string;
  confirmEndpoint: string;
  suggestions: string[];
  aiConfigured: boolean;
  usage: Usage;
  placeholder?: string;
};

export function AssistantChat({ endpoint, confirmEndpoint, suggestions, aiConfigured, usage, placeholder = "Ask a question…" }: AssistantChatProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [decided, setDecided] = useState<Record<string, string>>({});
  // A card that needs a password (and, for archiving, the typed MRN) shows its message here.
  const [needs, setNeeds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [turns, pending]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    const next: Turn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setDraft("");
    setError("");
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the last 20 turns travel; the server keeps no conversation.
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data: { reply?: string; by?: string; proposals?: Proposal[]; error?: string } = await response.json().catch(() => ({}));
      if (data.reply) setTurns([...next, { role: "assistant", content: data.reply, by: data.by, proposals: data.proposals }]);
      else setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  /** Confirm or cancel a prepared change. A reply asking for a password or the typed MRN reopens the card's fields instead of ending it. */
  async function decide(proposal: Proposal, decision: "confirm" | "cancel", extra: { password?: string; typed?: string } = {}) {
    setBusy(proposal.id);
    try {
      const response = await fetch(confirmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: proposal.id, decision, ...extra }),
      });
      const data: { ok?: boolean; message?: string; error?: string; need?: "password" | "typed" } = await response.json().catch(() => ({}));
      if (data.need) setNeeds((current) => ({ ...current, [proposal.id]: data.message ?? "" }));
      else setDecided((current) => ({ ...current, [proposal.id]: data.message ?? data.error ?? "Something went wrong." }));
    } catch {
      setDecided((current) => ({ ...current, [proposal.id]: "Couldn't reach the server. Nothing was changed." }));
    } finally {
      setBusy("");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  return (
    <div className={`${PANEL} flex min-h-[60dvh] flex-1 flex-col`}>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5 md:p-4" role="log" aria-live="polite" aria-label="Conversation">
        {turns.length === 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] text-console-muted">Try one of these, or ask your own question.</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="min-h-11 cursor-pointer rounded-lg border border-console-line px-3 text-left text-[13px] transition-colors duration-150 hover:border-console-accent/50 focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, index) => (
          <div key={index} className={`flex flex-col gap-1.5 ${turn.role === "user" ? "items-end" : "items-start"}`}>
            <p
              className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                turn.role === "user" ? "bg-console-accent text-console-on-accent" : "border border-console-line bg-console-canvas"
              }`}
            >
              <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>
              {turn.content}
            </p>
            {turn.by && <span className="text-[10px] text-console-subtle">{BY_LABEL[turn.by] ?? turn.by}</span>}
            {turn.proposals?.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} outcome={decided[proposal.id]} message={needs[proposal.id]} busy={busy === proposal.id} onDecide={decide} />
            ))}
          </div>
        ))}
        {pending && <p className="text-[13px] text-console-subtle">Looking that up…</p>}
        {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
        <div ref={end} />
      </div>
      <p className="border-t border-console-line px-3.5 py-2 text-[11px] text-console-subtle">
        Today: {usage.ruleAnswers} instant answer{usage.ruleAnswers === 1 ? "" : "s"} (free) · {usage.aiCalls} of {usage.limit} AI answers
        {!aiConfigured && " · AI layer off"}
      </p>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-console-line p-3">
        <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={4000}
          autoComplete="off"
          placeholder={placeholder}
          className={`${CONSOLE_INPUT} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label="Send"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg bg-console-accent text-console-on-accent transition-colors duration-150 hover:bg-console-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-accent disabled:cursor-not-allowed disabled:opacity-50 md:size-9"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
      </form>
    </div>
  );
}

function ProposalCard({
  proposal,
  outcome,
  message,
  busy,
  onDecide,
}: {
  proposal: Proposal;
  outcome?: string;
  message?: string;
  busy: boolean;
  onDecide: (proposal: Proposal, decision: "confirm" | "cancel", extra?: { password?: string; typed?: string }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  // Archiving always shows both fields; an edit shows the password only when the server asks for it.
  const askPassword = proposal.stepUp === "password+typed" || message !== undefined;
  const askTyped = proposal.stepUp === "password+typed";
  const ready = (!askPassword || password.length > 0) && (!askTyped || typed.trim().length > 0);

  return (
    <div className="flex w-full max-w-[85%] flex-col gap-2 rounded-xl border border-console-accent/40 bg-console-accent/8 p-3">
      <p className="text-[13px] font-semibold">{proposal.summary}</p>
      {outcome ? (
        <p role="status" className="text-xs text-console-muted">{outcome}</p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onDecide(proposal, "confirm", { password: password || undefined, typed: typed || undefined }).then(() => setPassword(""));
          }}
        >
          {askPassword && (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Your password
                <PasswordInput autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${CONSOLE_INPUT} font-normal`} />
              </label>
              {askTyped && (
                <label className="flex flex-col gap-1 text-xs font-semibold">
                  Type {proposal.phrase} to confirm
                  <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} className={`${CONSOLE_INPUT} font-data font-normal`} />
                </label>
              )}
            </>
          )}
          {message && <p role="alert" className="text-xs text-console-danger">{message}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !ready} className="min-h-11 cursor-pointer rounded-lg bg-console-accent px-3 text-xs font-semibold text-console-on-accent hover:bg-console-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-accent disabled:cursor-not-allowed disabled:opacity-50 md:min-h-8">
              {busy ? "Working…" : "Confirm"}
            </button>
            <button type="button" disabled={busy} onClick={() => void onDecide(proposal, "cancel")} className="min-h-11 cursor-pointer rounded-lg border border-console-line px-3 text-xs font-semibold hover:border-console-accent/50 focus-visible:outline-2 focus-visible:outline-console-accent disabled:opacity-50 md:min-h-8">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
