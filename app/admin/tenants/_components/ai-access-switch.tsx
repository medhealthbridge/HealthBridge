"use client";

import { useOptimistic, useTransition } from "react";
import { Pill } from "@/src/components/console/pill";
import { ToggleSwitch } from "@/src/components/console/toggle-switch";
import { useToast } from "@/src/components/console/toast";
import { setTenantAiAccessAction } from "@/src/server/actions/tenants";

/** Grants or revokes a tenant owner's AI assistant. Staff see the state; only the founder can change it. */
export function AiAccessSwitch({ accountId, name, enabled, canManage }: { accountId: string; name: string; enabled: boolean; canManage: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [, start] = useTransition();
  const toast = useToast();

  if (!canManage) return <Pill tone={enabled ? "accent" : "neutral"}>{enabled ? "On" : "Off"}</Pill>;

  function toggle() {
    const next = !optimistic;
    const data = new FormData();
    data.set("accountId", accountId);
    data.set("enabled", String(next));
    start(async () => {
      setOptimistic(next);
      const result = await setTenantAiAccessAction(data);
      toast(result.message ?? `AI assistant ${next ? "granted to" : "revoked for"} ${name}`);
    });
  }

  return <ToggleSwitch checked={optimistic} onChange={toggle} label={`AI assistant for ${name}`} />;
}
