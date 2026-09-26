"use client";

import { useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { Panel } from "@/src/components/console/panel";
import { Pill } from "@/src/components/console/pill";
import { useToast } from "@/src/components/console/toast";
import { FEEDBACK_CATEGORIES } from "@/src/lib/mock-data/clinix-admin";

const LABEL = "text-[11px] font-medium tracking-widest text-console-subtle uppercase";

export function FeedbackForm() {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Panel className="flex max-w-lg flex-col items-start gap-2 p-5">
        <Pill tone="accent">Sent</Pill>
        <p className="text-[13px]">Thanks — our team will follow up by email if needed.</p>
        <ConsoleButton onClick={() => setSent(false)}>Send another</ConsoleButton>
      </Panel>
    );
  }

  return (
    <Panel className="max-w-lg p-5">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage("");
          setSent(true);
          toast("Feedback sent — our team will follow up by email");
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Category</span>
          <select name="category" defaultValue={FEEDBACK_CATEGORIES[0]} className={`${CONSOLE_INPUT} cursor-pointer`}>
            {FEEDBACK_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Message</span>
          <textarea
            name="message"
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what happened or what you’d like to see…"
            className={`${CONSOLE_INPUT} min-h-28 resize-y py-2`}
          />
        </label>
        <ConsoleButton type="submit" variant="primary" disabled={!message.trim()} className="self-start">
          Send feedback
        </ConsoleButton>
      </form>
    </Panel>
  );
}
