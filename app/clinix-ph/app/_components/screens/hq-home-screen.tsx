import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { BRANCHES, HQ_STOCK_ALERT_COUNT } from "@/src/lib/mock-data/clinix-app";
import { formatPeso } from "@/src/lib/utils";
import type { BranchKey } from "@/src/types/clinix-app";
import { CONSOLE_LINKS } from "../../_data";
import { Kicker } from "../kicker";
import { Pill } from "../pill";
import { SectionHeading } from "../section-heading";

/** Owner, HQ mode: how all branches are doing today, and the way into the console. */
export function HqHomeScreen({ onOpenBranch }: { onOpenBranch: (branch: BranchKey) => void }) {
  const revenue = BRANCHES.reduce((total, branch) => total + branch.revenue, 0);
  const visits = BRANCHES.reduce((total, branch) => total + branch.patients, 0);

  return (
    <div className="flex flex-col gap-3.5">
      <section className="rounded-xl bg-brand p-4 text-white">
        <p className="text-[9.5px] font-semibold tracking-[0.14em] uppercase opacity-85">
          Gross revenue · today · all branches
        </p>
        <p className="my-1.5 font-display text-[40px] leading-none font-extrabold tracking-tight">{formatPeso(revenue)}</p>
        <dl className="flex gap-5 border-t-2 border-white/45 pt-2.5">
          <div>
            <dt className="text-[9.5px] font-semibold tracking-[0.12em] uppercase opacity-85">Patient visits</dt>
            <dd className="font-display text-[19px] font-extrabold">{visits}</dd>
          </div>
          <div>
            <dt className="text-[9.5px] font-semibold tracking-[0.12em] uppercase opacity-85">Branches live</dt>
            <dd className="font-display text-[19px] font-extrabold">{BRANCHES.length} / {BRANCHES.length}</dd>
          </div>
          <div>
            <dt className="text-[9.5px] font-semibold tracking-[0.12em] uppercase opacity-85">Stock alerts</dt>
            <dd className="font-display text-[19px] font-extrabold">{HQ_STOCK_ALERT_COUNT}</dd>
          </div>
        </dl>
      </section>

      <SectionHeading title="Subdomains" aside="Live status" />

      <ul className="flex flex-col gap-3.5">
        {BRANCHES.map((branch) => (
          <li key={branch.key} className="flex flex-col gap-2.5 rounded-xl bg-white p-3.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="truncate font-display text-base leading-tight font-extrabold text-slate-900">{branch.name}</div>
                <div className="truncate text-[10.5px] text-slate-500">{branch.url}</div>
              </div>
              <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                <Pill tone="neutral">{branch.specialty}</Pill>
                <span className="text-[9.5px] font-semibold tracking-wider text-brand uppercase">{branch.status}</span>
              </div>
            </div>
            <div className="flex items-end gap-2.5 border-t border-slate-200 pt-2.5">
              <div className="flex-1">
                <Kicker>Revenue today</Kicker>
                <div className="font-display text-[17px] font-extrabold text-slate-900">{formatPeso(branch.revenue)}</div>
              </div>
              <div className="flex-1">
                <Kicker>Patients</Kicker>
                <div className="font-display text-[17px] font-extrabold text-slate-900">{branch.patients}</div>
              </div>
              <button
                type="button"
                onClick={() => onOpenBranch(branch.key)}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 text-[12px] font-semibold text-slate-900 transition-colors duration-150 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Open portal
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConsoleCard />
    </div>
  );
}

/**
 * The only bridge from HQ into setup and analysis. Adding a branch, editing
 * prices, inviting staff, moving stock and reading Z-reads are console jobs —
 * this card links to them rather than repeating them on the phone.
 */
function ConsoleCard() {
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
      <div>
        <Kicker>Owner console</Kicker>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
          Setup and analysis live on the bigger screen — pricing, staff, stock and paperwork.
        </p>
      </div>
      <ul className="flex flex-col">
        {CONSOLE_LINKS.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className="flex min-h-11 cursor-pointer items-center gap-2 border-t border-slate-200 text-[13px] font-semibold text-slate-900 transition-colors duration-150 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
            >
              {link.label}
              <ExternalLink aria-hidden="true" className="ml-auto size-3.5 text-brand" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
