"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { PANEL } from "@/src/components/console/panel";

type Turn = { role: "user" | "assistant"; content: string };

export function AssistantChat({ suggestions, configured }: { suggestions: string[]; configured: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
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
      const data: { reply?: string; error?: string } = await response.json().catch(() => ({}));
      if (data.reply) setTurns([...next, { role: "assistant", content: data.reply }]);
      else setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  if (!configured) {
    return (
      <div className={`${PANEL} px-4 py-8 text-center text-[13px] text-console-muted`}>
        The assistant isn&rsquo;t switched on yet. Add <code className="font-data">ANTHROPIC_API_KEY</code> to the project&rsquo;s environment and redeploy.
      </div>
    );
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
          <div key={index} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                turn.role === "user" ? "bg-console-accent text-console-on-accent" : "border border-console-line bg-console-canvas"
              }`}
            >
              <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>
              {turn.content}
            </p>
          </div>
        ))}
        {pending && <p className="text-[13px] text-console-subtle">Looking that up…</p>}
        {error && <p role="alert" className="text-xs text-console-danger">{error}</p>}
        <div ref={end} />
      </div>
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
