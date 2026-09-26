"use client";

import { useState } from "react";
import { REPORT_RANGES } from "@/src/lib/constants";
import { consoleButtonClass } from "./console-button";

export function RangeTabs() {
  const [range, setRange] = useState<string>("today");

  return (
    <div role="group" aria-label="Reporting range" className="flex gap-1.5">
      {REPORT_RANGES.map((option) => {
        const selected = option.key === range;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={selected}
            onClick={() => setRange(option.key)}
            className={consoleButtonClass("secondary", "sm", selected ? "border-console-accent text-console-accent" : "")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
