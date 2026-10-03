import { formatPeso } from "@/src/lib/utils";

/** Runs a read tool directly (no model, so full values, no redaction). */
export type RuleRunner = (tool: string, input?: unknown) => Promise<unknown>;

type Rule = { id: string; test: RegExp; answer: (run: RuleRunner, match: RegExpMatchArray) => Promise<string> };

type Summary = { total: number; byStatus: Record<string, number>; activeMrr: number; trialsEndingSoon: { name: string; endsOn: string }[] };
type FoundTenants = { matched: number; tenants: { name: string; tier: string; status: string; clinics: number; monthlyRevenuePesos: number; renewsOrTrialEnds: string }[] };

const tenantLine = (t: FoundTenants["tenants"][number]) =>
  `• ${t.name} — ${t.tier}, ${t.status}, ${t.clinics} clinic${t.clinics === 1 ? "" : "s"}${t.monthlyRevenuePesos ? `, ${formatPeso(t.monthlyRevenuePesos)}/mo` : ""}, ${t.renewsOrTrialEnds}`;

// Anything that asks for a change goes to the model, which can only propose it for confirmation.
const CHANGE_WORDS = /\b(invite|lock|unlock|masterlock|suspend|change|upgrade|downgrade|deactivate|restore|refund|delete|remove|set|move|cancel)\b/i;

const RULES: Rule[] = [
  {
    id: "help",
    test: /^(hi|hello|hey|help|what can you do)\b/i,
    answer: async () =>
      "I can tell you how the business is doing, which trials end soon, who is past due, domain orders that need review, your team, and details on any tenant (for example “tell me about Bright Smile”).",
  },
  {
    id: "domain-orders",
    test: /\bdomain\b.*\b(review|stuck|failed|problem|attention)\b|\b(review|stuck|failed)\b.*\bdomain/i,
    answer: async (run) => {
      const orders = (await run("list_orders_needing_review")) as { domain: string; amountPesos: number; reason: string | null }[];
      return orders.length === 0 ? "No domain orders need review." : `${orders.length} domain order(s) need review:\n${orders.map((o) => `• ${o.domain} (${formatPeso(o.amountPesos)}) — ${o.reason ?? "no reason recorded"}`).join("\n")}`;
    },
  },
  {
    id: "trials",
    test: /\btrials?\b/i,
    answer: async (run) => {
      const { trialsEndingSoon } = (await run("get_platform_summary")) as Summary;
      return trialsEndingSoon.length === 0 ? "No trials end in the next 7 days." : `Trials ending within 7 days:\n${trialsEndingSoon.map((t) => `• ${t.name} — ${t.endsOn}`).join("\n")}`;
    },
  },
  {
    id: "past-due",
    test: /\b(past due|overdue|unpaid|late payments?)\b/i,
    answer: async (run) => {
      const found = (await run("find_tenants", { status: "Past due" })) as FoundTenants;
      return found.matched === 0 ? "No tenants are past due." : `${found.matched} past due:\n${found.tenants.map(tenantLine).join("\n")}`;
    },
  },
  {
    id: "team",
    test: /\b(team|staff|admins?)\b/i,
    answer: async (run) => {
      const people = (await run("list_company_staff")) as { name: string; email: string; role: string; state: string }[];
      return `${people.length} on the team and invites:\n${people.map((p) => `• ${p.name} (${p.email}) — ${p.role.replace("_", " ")}, ${p.state}`).join("\n")}`;
    },
  },
  {
    id: "about-tenant",
    test: /^(?:tell me about|details (?:of|for|on)|info (?:on|about)|show me|who is)\s+(.{2,80}?)\??$/i,
    answer: async (run, match) => {
      const result = (await run("get_tenant", { name: match[1] })) as { found: boolean; note?: string; tenant?: { name: string; ownerEmail: string; tier: string; status: string; clinicCount: number; clinics: { name: string; subdomain: string }[]; monthlyRevenuePesos: number; renewsOrTrialEnds: string; joined: string } };
      if (!result.found || !result.tenant) return result.note ?? "I couldn't find that tenant.";
      const t = result.tenant;
      return `${t.name} — ${t.tier}, ${t.status}\nOwner: ${t.ownerEmail}\nClinics (${t.clinicCount}): ${t.clinics.map((c) => `${c.name} (${c.subdomain})`).join(", ")}\nRevenue: ${t.monthlyRevenuePesos ? `${formatPeso(t.monthlyRevenuePesos)}/mo` : "none"}\nRenews / trial ends: ${t.renewsOrTrialEnds}\nJoined: ${t.joined}`;
    },
  },
  {
    id: "summary",
    test: /\b(summary|overview|mrr|revenue|how (?:is|are) (?:the )?(?:business|we|things)|how many (?:tenants|clients|accounts))\b/i,
    answer: async (run) => {
      const s = (await run("get_platform_summary")) as Summary;
      return `${s.total} tenants: ${s.byStatus.Active} active, ${s.byStatus.Trial} trial, ${s.byStatus["Past due"]} past due, ${s.byStatus.Cancelled} cancelled.\nMonthly recurring revenue: ${formatPeso(s.activeMrr)}.\n${s.trialsEndingSoon.length} trial(s) end within 7 days.`;
    },
  },
  {
    id: "list-tenants",
    test: /\b(list|show|all)\b.*\b(tenants|clients|accounts)\b/i,
    answer: async (run) => {
      const found = (await run("find_tenants", { limit: 20 })) as FoundTenants;
      return found.matched === 0 ? "There are no tenants yet." : `${found.matched} tenants${found.matched > 20 ? " (first 20)" : ""}:\n${found.tenants.map(tenantLine).join("\n")}`;
    },
  },
];

const MAX_RULE_QUESTION = 140;

/** Free, instant answers for the questions asked every day. Returns null when nothing fits, so a model can take it. */
export async function answerByRules(question: string, run: RuleRunner): Promise<string | null> {
  const text = question.trim();
  if (text.length > MAX_RULE_QUESTION || CHANGE_WORDS.test(text)) return null;
  for (const rule of RULES) {
    const match = text.match(rule.test);
    if (match) return rule.answer(run, match);
  }
  return null;
}
