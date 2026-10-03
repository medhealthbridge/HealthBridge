"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { PANEL } from "@/src/components/console/panel";

type Proposal = { id: string; summary: string };
type Turn = { role: "user" | "assistant"; content: string; by?: string; proposals?: Proposal[] };
type Usage = { aiCalls: number; ruleAnswers: number; tokens: number; limit: number };

const BY_LABEL: Record<string, string> = { rules: "Instant answer", gemini: "Gemini", anthropic: "Claude" };

export function AssistantChat({ suggestions, aiConfigured, usage }: { suggestions: string[]; aiConfigured: boolean; usage: Usage }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [decided, setDecided] = useState<Record<string, string>>({});
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
      const response = await fetch("/api/admin/agent", {
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

  async function decide(actionId: string, decision: "confirm" | "cancel") {
    setDecided((current) => ({ ...current, [actionId]: "…" }));
    try {
      const response = await fetch("/api/admin/agent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, decision }),
      });
      const data: { message?: string; error?: string } = await response.json().catch(() => ({}));
      setDecided((current) => ({ ...current, [actionId]: data.message ?? data.error ?? "Something went wrong." }));
    } catch {
      setDecided((current) => ({ ...current, [actionId]: "Couldn't reach the server. Nothing was changed." }));
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
              <div key={proposal.id} className="flex max-w-[85%] flex-col gap-2 rounded-xl border border-console-accent/40 bg-console-accent/8 p-3">
                <p className="text-[13px] font-semibold">{proposal.summary}</p>
                {decided[proposal.id] ? (
                  <p role="status" className="text-xs text-console-muted">{decided[proposal.id]}</p>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void decide(proposal.id, "confirm")} className="min-h-11 cursor-pointer rounded-lg bg-console-accent px-3 text-xs font-semibold text-console-on-accent hover:bg-console-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-accent md:min-h-8">
                      Confirm
                    </button>
                    <button type="button" onClick={() => void decide(proposal.id, "cancel")} className="min-h-11 cursor-pointer rounded-lg border border-console-line px-3 text-xs font-semibold hover:border-console-accent/50 focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-8">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
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
          placeholder="Ask about tenants, revenue, staff…"
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
