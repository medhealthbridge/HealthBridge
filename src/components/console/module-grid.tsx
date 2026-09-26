"use client";

import { useState } from "react";
import type { PlatformModule } from "@/src/types/console";
import { Panel } from "./panel";
import { Pill } from "./pill";
import { useToast } from "./toast";
import { ToggleSwitch } from "./toggle-switch";

type ModuleGridProps = {
  modules: PlatformModule[];
  /** Pill text for on / off, e.g. ["Live", "Not released"]. */
  stateLabels: [on: string, off: string];
  /** Toast suffix for on / off, e.g. [" turned on platform-wide", " turned off platform-wide"]. */
  toastSuffixes: [on: string, off: string];
};

export function ModuleGrid({ modules: initial, stateLabels, toastSuffixes }: ModuleGridProps) {
  const toast = useToast();
  const [modules, setModules] = useState(initial);

  function toggle(module: PlatformModule) {
    setModules((current) => current.map((m) => (m.id === module.id ? { ...m, on: !m.on } : m)));
    toast(module.name + (module.on ? toastSuffixes[1] : toastSuffixes[0]));
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => (
        <Panel key={module.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-extrabold tracking-tight">{module.name}</h2>
              <span className="font-data text-[11px] text-console-subtle">{module.code}</span>
            </div>
            <ToggleSwitch checked={module.on} onChange={() => toggle(module)} label={`${module.name} enabled`} />
          </div>
          <p className="text-[13px] leading-normal text-console-muted">{module.desc}</p>
          <div className="flex items-center gap-2">
            <Pill tone={module.on ? "accent" : "neutral"}>{module.on ? stateLabels[0] : stateLabels[1]}</Pill>
            {module.tenants !== undefined && (
              <span className="font-data text-[11px] text-console-subtle">{module.tenants} tenants</span>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
