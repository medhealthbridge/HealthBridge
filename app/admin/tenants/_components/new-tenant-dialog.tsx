"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { FormField } from "@/src/components/console/form-field";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { useToast } from "@/src/components/console/toast";
import { createTenantAction, type NewTenantState } from "@/src/server/actions/tenants";
import { CLINIC_DOMAIN_SUFFIX } from "@/src/lib/constants";
import { SPECIALTY_LABELS } from "@/src/lib/clinic-labels";
import { TENANT_TIERS } from "@/src/lib/schemas/tenant";

const INITIAL: NewTenantState = {};
const TIER_LABELS = { tier_1: "Tier 1 · 1 clinic", tier_2: "Tier 2 · 2 clinics", tier_3: "Tier 3 · 3 clinics", tier_4: "Tier 4 · 4 clinics" };

export function NewTenantDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createTenantAction, INITIAL);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.created && handled.current !== state) {
      setOpen(false);
      toast(state.created.emailed ? `${state.created.company} created — setup link sent` : `${state.created.company} created — email failed, resend from the owner's login page`);
    }
    handled.current = state;
  }, [state, toast]);

  const errors = state.fieldErrors ?? {};
  const v = (key: string) => (state.values as Record<string, string> | undefined)?.[key] ?? "";
  const field = (key: keyof typeof errors) => ({
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? `nt-${key}-error` : undefined,
  });

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        + New tenant
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="New tenant">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="New tenant" subtitle="Opens the account and emails the owner a link to set their password." onClose={() => setOpen(false)} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="nt-companyName" label="Business name" error={errors.companyName?.[0]}>
              <input id="nt-companyName" name="companyName" required defaultValue={v("companyName")} autoComplete="off" className={CONSOLE_INPUT} {...field("companyName")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="nt-ownerName" label="Owner's name" error={errors.ownerName?.[0]}>
                <input id="nt-ownerName" name="ownerName" required defaultValue={v("ownerName")} autoComplete="off" className={CONSOLE_INPUT} {...field("ownerName")} />
              </FormField>
              <FormField id="nt-ownerEmail" label="Owner's email" error={errors.ownerEmail?.[0]}>
                <input id="nt-ownerEmail" name="ownerEmail" type="email" required defaultValue={v("ownerEmail")} autoComplete="off" className={CONSOLE_INPUT} {...field("ownerEmail")} />
              </FormField>
            </div>
            <FormField id="nt-subdomain" label="Subdomain" error={errors.subdomain?.[0]} hint={`Becomes <name>${CLINIC_DOMAIN_SUFFIX}`}>
              <input id="nt-subdomain" name="subdomain" required defaultValue={v("subdomain")} autoComplete="off" autoCapitalize="none" spellCheck={false} className={CONSOLE_INPUT} {...field("subdomain")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="nt-branchName" label="First branch" error={errors.branchName?.[0]}>
                <input id="nt-branchName" name="branchName" required defaultValue={v("branchName")} autoComplete="off" className={CONSOLE_INPUT} {...field("branchName")} />
              </FormField>
              <FormField id="nt-branchCity" label="City" error={errors.branchCity?.[0]}>
                <input id="nt-branchCity" name="branchCity" required defaultValue={v("branchCity")} autoComplete="off" className={CONSOLE_INPUT} {...field("branchCity")} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField id="nt-specialty" label="Specialty" error={errors.specialty?.[0]}>
                <select id="nt-specialty" name="specialty" defaultValue={v("specialty") || "dental"} className={CONSOLE_INPUT}>
                  {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="nt-tier" label="Tier" error={errors.tier?.[0]}>
                <select id="nt-tier" name="tier" defaultValue={v("tier") || "tier_1"} className={CONSOLE_INPUT}>
                  {TENANT_TIERS.map((tier) => (
                    <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                  ))}
                </select>
              </FormField>
              <FormField id="nt-plan" label="Start as" error={errors.plan?.[0]}>
                <select id="nt-plan" name="plan" defaultValue={v("plan") || "trial"} className={CONSOLE_INPUT}>
                  <option value="trial">15-day trial</option>
                  <option value="active">Active (30 days)</option>
                </select>
              </FormField>
            </div>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending}>
              {pending ? "Creating…" : "Create tenant"}
            </ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
