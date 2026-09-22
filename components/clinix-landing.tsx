"use client";

import { useState } from "react";

type Problem = { before: string; after: string };
type Feature = { name: string; desc: string };
type Compliance = { tag: string; name: string; desc: string };
type Role = { name: string; desc: string };
type Faq = { q: string; a: string };
type SpecialtyKey = "dental" | "eye" | "vet" | "derma";
type SpecialtyMock = {
  subdomain: string;
  title: string;
  sideTitle: string;
  sideValue: string;
  sideSub: string;
  rows: { a: string; b: string }[];
};
type Tier = { name: string; price: string; note: string; cta: string };

const SPECIALTY_MOCKS: Record<SpecialtyKey, SpecialtyMock> = {
  dental: {
    subdomain: "bgc-dental.clinix.ph",
    title: "Today's chair schedule",
    sideTitle: "Tooth chart",
    sideValue: "#36",
    sideSub: "Root canal — session 2 of 3",
    rows: [
      { a: "Maria Santos", b: "9:00 AM" },
      { a: "Joel Ramirez", b: "9:40 AM" },
      { a: "Andrea Tan", b: "10:20 AM" },
    ],
  },
  eye: {
    subdomain: "qc-eye.clinix.ph",
    title: "Refraction record",
    sideTitle: "Lens stock",
    sideValue: "18",
    sideSub: "progressive lenses on hand",
    rows: [
      { a: "OD sphere", b: "-1.75" },
      { a: "OS sphere", b: "-1.50" },
      { a: "Visual acuity", b: "20/20 cc" },
    ],
  },
  vet: {
    subdomain: "makati-vet.clinix.ph",
    title: "Pet profile — Bantay",
    sideTitle: "Vaccine due",
    sideValue: "5-in-1",
    sideSub: "due in 6 days · SMS queued",
    rows: [
      { a: "Species / breed", b: "Golden Retriever" },
      { a: "Weight", b: "28.4 kg" },
      { a: "Owner", b: "L. Mendoza" },
    ],
  },
  derma: {
    subdomain: "cebu-derma.clinix.ph",
    title: "Treatment plan",
    sideTitle: "Package balance",
    sideValue: "4 of 6",
    sideSub: "sessions remaining · paid",
    rows: [
      { a: "Procedure", b: "Laser · face" },
      { a: "Last session", b: "12 Sep 2026" },
      { a: "HMO", b: "Maxicare — LOA filed" },
    ],
  },
};

const PROBLEMS: Problem[] = [
  {
    before: "Patient charts in folders behind reception",
    after:
      "Full history, x-rays and notes searchable in seconds — from the chair or the front desk.",
  },
  {
    before: "Bookings in a notebook and a Messenger thread",
    after:
      "One calendar per clinic with automatic SMS and Viber reminders to cut no-shows.",
  },
  {
    before: "Computing the 20% senior discount by hand",
    after:
      "SC and PWD discounts, VAT exemption and the sales-book entry computed automatically.",
  },
  {
    before: "PhilHealth and HMO claims chased over email",
    after:
      "Claims tracked from filing to payment, with an aging list of what is still unpaid.",
  },
  {
    before: "Finding out you ran out of composite mid-procedure",
    after:
      "Live stock per branch, low-stock alerts, and transfers between your own clinics.",
  },
  {
    before: "No idea which branch or service actually earns",
    after:
      "Daily sales, top services, no-show rate and per-doctor professional fees in one report.",
  },
];

const FEATURES: Feature[] = [
  {
    name: "Patient records",
    desc: "Structured history with specialty fields — odontogram, refraction, vaccine card — plus x-ray and lab attachments. Every edit keeps an amendment trail.",
  },
  {
    name: "Appointments & queue",
    desc: "Per-chair scheduling, walk-in quick-add, a now-serving queue display, and assistant-side confirmation before a slot is locked.",
  },
  {
    name: "Billing & POS",
    desc: "Cash, GCash, Maya, card and HMO in one checkout, with official receipt numbering and a printable 58mm or 80mm thermal receipt.",
  },
  {
    name: "Inventory",
    desc: "Stock per branch, expiry tracking for consumables, low-stock alerts and inter-branch transfers with an approval trail.",
  },
  {
    name: "Reports",
    desc: "End-of-day reconciliation, collections by payment method, top services, no-show rate and per-practitioner earnings.",
  },
  {
    name: "Recalls & follow-ups",
    desc: "Six-month dental recalls, vet vaccine due dates and post-procedure check-ins scheduled and sent automatically.",
  },
  {
    name: "Staff & roles",
    desc: "Invite by email, assign a role, deactivate instantly — records stay, access stops. Shared front-desk terminals get a quick PIN lock.",
  },
  {
    name: "Multi-branch HQ",
    desc: "One owner login across every clinic you run, with branch-vs-branch comparison and consolidated stock.",
  },
  {
    name: "Patient app",
    desc: "Your patients book, reschedule, see their queue number and view their own records — on their phone, no app install needed.",
  },
];

const COMPLIANCE: Compliance[] = [
  {
    tag: "RA 9994",
    name: "Senior citizen discount",
    desc: "20% discount and VAT exemption applied on qualifying services, with the OSCA ID recorded against the transaction.",
  },
  {
    tag: "RA 10754",
    name: "PWD discount",
    desc: "PWD ID captured at intake, discount computed the same way, and both kept out of the VATable base.",
  },
  {
    tag: "PhilHealth",
    name: "Claims & case rates",
    desc: "Member PIN on file, claim status tracked per visit, and a resubmission path when a claim is returned or denied.",
  },
  {
    tag: "HMO",
    name: "LOA & receivables",
    desc: "Letters of authorisation per visit, receivables aged by payor, and a follow-up list for anything past terms.",
  },
  {
    tag: "BIR",
    name: "Receipts & sales book",
    desc: "Official receipt series, VAT and VAT-exempt sales split correctly, and an exportable summary for your bookkeeper.",
  },
  {
    tag: "RA 10173",
    name: "Data Privacy Act",
    desc: "Consent captured at registration, a log of who viewed each record, and retention rules you can point an auditor at.",
  },
];

const ROLES: Role[] = [
  {
    name: "Owner",
    desc: "Everything, across every clinic: billing, staff, stock, reports and the HQ view.",
  },
  {
    name: "Practitioner",
    desc: "Own schedule, own patients, clinical notes and personal professional-fee earnings.",
  },
  {
    name: "Assistant",
    desc: "Front desk only: queue, intake, POS. No revenue figures, no stock, no settings.",
  },
  {
    name: "Patient",
    desc: "Books visits, views their own records and pays online. Nothing clinic-side.",
  },
  {
    name: "Platform admin",
    desc: "Your account manager on our side — subscription and support, never your patient data.",
  },
];

const TIERS: Record<number, Tier> = {
  1: {
    name: "1 clinic",
    price: "₱1,490/mo",
    note: "Everything included. Unlimited patients and staff.",
    cta: "Start 15-day free trial",
  },
  2: {
    name: "2 clinics",
    price: "₱2,690/mo",
    note: "Includes the HQ view across both clinics.",
    cta: "Start 15-day free trial",
  },
  3: {
    name: "3 clinics",
    price: "₱3,690/mo",
    note: "Consolidated stock and branch comparison.",
    cta: "Start 15-day free trial",
  },
  4: {
    name: "4 clinics",
    price: "₱4,590/mo",
    note: "Inter-branch transfers with approval trail.",
    cta: "Start 15-day free trial",
  },
  5: {
    name: "5+ clinics — Enterprise",
    price: "Custom",
    note: "Volume pricing, onboarding support and data migration.",
    cta: "Talk to us",
  },
};

const FAQS: Faq[] = [
  {
    q: "Can you move our existing patient records in?",
    a: "Yes. Onboarding includes an import from spreadsheets or exports from most clinic systems, checked with you before go-live.",
  },
  {
    q: "Does it work if the internet drops mid-clinic?",
    a: "The front-desk view keeps working on an unstable connection and syncs once it recovers, so you can keep checking patients in.",
  },
  {
    q: "What happens after the 15-day trial?",
    a: "Add a payment method from the dashboard. If you do not, the workspace becomes read-only behind a reactivation screen — nothing is deleted.",
  },
  {
    q: "Can one login handle several clinics?",
    a: "Yes. An owner sees every clinic they run from one HQ login, while each clinic keeps its own subdomain, staff list and records.",
  },
  {
    q: "Does it run on a tablet at reception?",
    a: "Yes — the front-desk, queue and chair-side views are designed for phone, tablet and desktop, with large tap targets and a larger-text mode.",
  },
  {
    q: "Can we print on our existing thermal printer?",
    a: "Receipts print to 58mm and 80mm thermal, and forms and certificates print to A4 or 8.5×13 long bond.",
  },
  {
    q: "Is our patient data shared with other clinics?",
    a: "Never. Each clinic is isolated at the database level, and every record view is logged and attributable to a named user.",
  },
];

const SPECIALTIES: { key: SpecialtyKey; label: string }[] = [
  { key: "dental", label: "Dental" },
  { key: "eye", label: "Eye care" },
  { key: "vet", label: "Veterinary" },
  { key: "derma", label: "Derma / skin" },
];

export default function ClinixLanding() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [specialty, setSpecialty] = useState<SpecialtyKey>("dental");
  const [annual, setAnnual] = useState(false);
  const [clinicCount, setClinicCount] = useState(1);
  const [subdomainName, setSubdomainName] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const activeMock = SPECIALTY_MOCKS[specialty];
  const activeTier = TIERS[clinicCount];
  const subdomainPreview = `${subdomainName || "yourclinic"}.clinix.ph`;
  const clinicCountLabel =
    clinicCount >= 5
      ? "5 or more clinics"
      : `${clinicCount} ${clinicCount > 1 ? "clinics" : "clinic"}`;

  return (
    <div className="cx-landing" data-theme={theme}>
      <nav className="cx-nav">
        <span className="cx-brand">Clinix PH</span>
        <div className="cx-navlinks">
          <a href="#problems">Why</a>
          <a href="#features">Features</a>
          <a href="#compliance">PH compliance</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="cx-nav-actions">
          <button
            type="button"
            className="btn-ghost cx-theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "☾ Dark" : "☀ Light"}
          </button>
          <a href="/clinix-ph/auth" className="btn-ghost cx-nav-login">
            Log in
          </a>
          <a href="/clinix-ph/auth" className="btn-jade cx-nav-cta">
            Start free trial
          </a>
        </div>
      </nav>

      <section className="sec cx-hero">
        <span className="pill cx-pill-static">
          <span className="cx-dot" />
          Built for Philippine clinics — dental, vet, eye care, derma
        </span>
        <h1 className="h1 cx-hero-h1">
          Stop running your clinic on notebooks, group chats and a shared
          spreadsheet.
        </h1>
        <p className="cx-hero-copy">
          Clinix PH puts patient records, appointments, billing, PhilHealth
          and HMO claims, and stock in one place — with senior-citizen and
          PWD discounts computed correctly, every time.
        </p>
        <div className="cx-hero-actions">
          <a href="/clinix-ph/auth" className="btn-jade cx-hero-primary">
            Start 15-day free trial →
          </a>
          <a href="#features" className="btn-ghost cx-hero-secondary">
            See features
          </a>
        </div>
        <span className="cx-hero-note">
          No credit card. Your data is never deleted, even if you cancel.
        </span>
      </section>

      <section id="problems" className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">01 / THE DAILY REALITY</span>
          <h2 className="h2">You already know where the day goes.</h2>
        </div>
        <div className="grid3">
          {PROBLEMS.map((p) => (
            <div className="card card-hov cx-problem-card" key={p.before}>
              <span className="cx-problem-before">{p.before}</span>
              <span className="cx-problem-after">{p.after}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">02 / BUILT PER SPECIALTY</span>
          <h2 className="h2">
            Not a generic CRM with &quot;patient&quot; pasted over
            &quot;customer&quot;.
          </h2>
        </div>
        <div className="cx-specialty-row">
          {SPECIALTIES.map((sp) => (
            <button
              key={sp.key}
              type="button"
              className={
                specialty === sp.key ? "pill cx-pill-static" : "pill"
              }
              onClick={() => setSpecialty(sp.key)}
            >
              {sp.label}
            </button>
          ))}
        </div>
        <div className="card cx-mock-card">
          <div className="cx-mock-titlebar">
            <span className="cx-dot-warn" />
            <span className="cx-dot-muted" />
            <span className="cx-dot-accent" />
            <span className="mono cx-mock-subdomain">
              {activeMock.subdomain}
            </span>
          </div>
          <div className="grid2 cx-mock-body">
            <div className="cx-mock-left">
              <span className="cx-mock-label">{activeMock.title}</span>
              {activeMock.rows.map((r) => (
                <div className="cx-mock-row" key={r.a}>
                  <span className="cx-mock-row-a">{r.a}</span>
                  <span className="mono cx-mock-row-b">{r.b}</span>
                </div>
              ))}
            </div>
            <div className="cx-mock-side">
              <span className="cx-mock-label">{activeMock.sideTitle}</span>
              <span className="mono cx-mock-side-value">
                {activeMock.sideValue}
              </span>
              <span className="cx-mock-side-sub">{activeMock.sideSub}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">03 / WHAT&apos;S INSIDE</span>
          <h2 className="h2">
            Everything the front desk and the chair both need.
          </h2>
        </div>
        <div className="grid3">
          {FEATURES.map((f) => (
            <div className="card card-hov cx-feature-card" key={f.name}>
              <h3 className="cx-feature-name">{f.name}</h3>
              <p className="cx-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="compliance" className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">04 / PHILIPPINE-SPECIFIC</span>
          <h2 className="h2">The parts foreign software gets wrong.</h2>
          <p className="cx-section-sub">
            Discount law, claims paperwork and receipt rules aren&apos;t
            add-ons here — they&apos;re the default behaviour.
          </p>
        </div>
        <div className="grid2">
          {COMPLIANCE.map((c) => (
            <div className="card card-hov cx-compliance-card" key={c.tag}>
              <span className="mono cx-compliance-tag">{c.tag}</span>
              <div className="cx-compliance-body">
                <h3 className="cx-compliance-name">{c.name}</h3>
                <p className="cx-compliance-desc">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">05 / WHO SEES WHAT</span>
          <h2 className="h2">Five roles, each locked to their own lane.</h2>
        </div>
        <div className="grid4">
          {ROLES.map((r) => (
            <div className="card card-hov cx-role-card" key={r.name}>
              <h3 className="cx-role-name">{r.name}</h3>
              <p className="cx-role-desc">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">06 / YOUR OWN WORKSPACE</span>
          <h2 className="h2">Each clinic on its own subdomain.</h2>
          <p className="cx-section-sub">
            Records never cross between clinics. Own more than one? One
            owner login switches between them from an HQ view.
          </p>
        </div>
        <div className="card cx-subdomain-card">
          <span className="cx-subdomain-label">Try your subdomain</span>
          <input
            className="mono cx-subdomain-input"
            value={subdomainName}
            onChange={(e) =>
              setSubdomainName(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              )
            }
            placeholder="yourclinic"
          />
          <div className="mono cx-subdomain-preview">{subdomainPreview}</div>
        </div>
      </section>

      <section id="pricing" className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">07 / PRICING</span>
          <h2 className="h2">Priced by how many clinics you run.</h2>
        </div>
        <div className="grid2 cx-pricing-grid">
          <div className="cx-pricing-controls">
            <div className="cx-annual-row">
              <span className="cx-annual-label">Monthly</span>
              <button
                type="button"
                className="cx-annual-toggle"
                onClick={() => setAnnual((a) => !a)}
                style={{
                  background: annual ? "var(--db-accent)" : "var(--db-border)",
                }}
              >
                <span
                  className="cx-annual-knob"
                  style={{ left: annual ? "23px" : "3px" }}
                />
              </button>
              <span className="cx-annual-label">
                Annual <span className="mono cx-annual-discount">−20%</span>
              </span>
            </div>
            <div className="cx-clinic-slider">
              <input
                type="range"
                min={1}
                max={5}
                value={clinicCount}
                onChange={(e) => setClinicCount(parseInt(e.target.value, 10))}
              />
              <span className="mono cx-clinic-count-label">
                {clinicCountLabel}
              </span>
            </div>
            <ul className="cx-pricing-list">
              <li>Unlimited patients and staff accounts</li>
              <li>All modules — records, booking, POS, inventory, reports</li>
              <li>PhilHealth, HMO and SC/PWD handling included</li>
              <li>Guided onboarding and data import</li>
            </ul>
          </div>
          <div className="card cx-tier-card">
            <span className="cx-tier-name">{activeTier.name}</span>
            <div className="mono cx-tier-price">{activeTier.price}</div>
            <span className="cx-tier-note">{activeTier.note}</span>
            <a href="/clinix-ph/auth" className="btn-jade cx-tier-cta">
              {activeTier.cta}
            </a>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="cx-section-head">
          <span className="mono cx-eyebrow">08 / TRUST</span>
          <h2 className="h2">On by default, not a paid tier.</h2>
        </div>
        <div className="grid3">
          <div className="card">Encrypted in transit and at rest</div>
          <div className="card">Row-level isolation per clinic</div>
          <div className="card">Audit log of every record view and edit</div>
        </div>
        <p className="cx-trust-copy">
          Data Privacy Act consent capture is built into patient intake. If a
          trial ends or a payment fails, the workspace becomes read-only
          behind a reactivation screen — records are never deleted.
        </p>
      </section>

      <section id="faq" className="sec cx-faq-section">
        <h2 className="h2">Frequently asked</h2>
        <div className="cx-faq-list">
          {FAQS.map((f, i) => {
            const open = faqOpen === i;
            return (
              <div
                className="card card-hov cx-faq-item"
                key={f.q}
                role="button"
                tabIndex={0}
                onClick={() => setFaqOpen(open ? null : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFaqOpen(open ? null : i);
                  }
                }}
              >
                <div className="cx-faq-row">
                  <span className="cx-faq-q">{f.q}</span>
                  <span className="mono cx-faq-icon">
                    {open ? "−" : "+"}
                  </span>
                </div>
                {open && <p className="cx-faq-a">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec cx-cta-section">
        <h2 className="h2">Set it up this week, not next quarter.</h2>
        <p className="cx-cta-copy">
          Import your patient list, invite your staff, and see your first
          booking the same day.
        </p>
        <div className="cx-cta-actions">
          <a href="/clinix-ph/auth" className="btn-jade cx-cta-primary">
            Start free trial
          </a>
          <a href="/clinix-ph/auth" className="btn-ghost cx-cta-secondary">
            View live demo
          </a>
        </div>
      </section>

      <footer className="cx-footer">
        <span>© 2026 Clinix PH — a DataBridgeSol product</span>
        <div className="cx-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Data Privacy Act</a>
        </div>
      </footer>

      <style jsx>{`
        .cx-landing {
          --db-bg: #0b0f17;
          --db-surface: #111827;
          --db-border: #1e293b;
          --db-text: #f1f5f9;
          --db-muted: #94a3b8;
          --db-muted2: #64748b;
          --db-accent: #00f5a0;
          --db-accent-ink: #0b0f17;
          --db-warn: #f59e0b;
          background: var(--db-bg);
          color: var(--db-text);
          min-height: 100vh;
          font-family: var(--font-body), system-ui, sans-serif;
        }
        .cx-landing[data-theme="light"] {
          --db-bg: #f5f7f6;
          --db-surface: #ffffff;
          --db-border: #e1e7e4;
          --db-text: #0b0f17;
          --db-muted: #4b5a55;
          --db-muted2: #6b7a75;
          --db-accent: #00a876;
          --db-accent-ink: #ffffff;
          --db-warn: #b45309;
        }
        .cx-landing :global(a) {
          color: var(--db-accent);
          text-decoration: none;
        }
        .cx-landing :global(h1),
        .cx-landing :global(h2),
        .cx-landing :global(h3) {
          font-family: var(--font-heading), sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--db-text);
        }
        .cx-landing :global(.mono) {
          font-family: var(--font-mono), monospace;
        }
        .cx-landing :global(.pill) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--db-border);
          background: var(--db-surface);
          font-size: 13px;
          color: var(--db-muted);
          cursor: pointer;
        }
        .cx-landing :global(.cx-pill-static) {
          border-color: var(--db-accent);
          color: var(--db-text);
          background: color-mix(in srgb, var(--db-accent) 10%, transparent);
        }
        .cx-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--db-accent);
        }
        .cx-landing :global(.card) {
          background: var(--db-surface);
          border: 1px solid var(--db-border);
          border-radius: 14px;
          padding: 22px;
        }
        .cx-landing :global(.card-hov:hover) {
          border-color: color-mix(in srgb, var(--db-accent) 40%, transparent);
        }
        .cx-landing :global(.btn-jade) {
          background: var(--db-accent);
          color: var(--db-accent-ink);
          font-weight: 700;
          padding: 13px 22px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          font-family: var(--font-body), sans-serif;
          font-size: 15px;
        }
        .cx-landing :global(.btn-ghost) {
          border: 1px solid var(--db-border);
          color: var(--db-text);
          padding: 13px 22px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          cursor: pointer;
          font-family: var(--font-body), sans-serif;
          font-size: 15px;
        }
        .cx-landing :global(.sec) {
          max-width: 1200px;
          margin: 0 auto;
          padding: 64px 48px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .cx-landing :global(.grid3) {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .cx-landing :global(.grid4) {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .cx-landing :global(.grid2) {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .cx-landing :global(.h1) {
          font-size: 56px;
          line-height: 1.02;
        }
        .cx-landing :global(.h2) {
          font-size: 32px;
        }
        .cx-landing :global(input[type="range"]) {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: var(--db-border);
          border-radius: 2px;
          outline: none;
          width: 100%;
        }
        .cx-landing :global(input[type="range"]::-webkit-slider-thumb) {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--db-accent);
          border: 3px solid var(--db-bg);
          box-shadow: 0 0 0 1px var(--db-accent);
          cursor: pointer;
          margin-top: -8px;
        }
        .cx-landing :global(input[type="range"]::-moz-range-thumb) {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--db-accent);
          border: 3px solid var(--db-bg);
          cursor: pointer;
        }

        .cx-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(10px);
          background: color-mix(in srgb, var(--db-bg) 82%, transparent);
          border-bottom: 1px solid var(--db-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 24px;
          flex-wrap: wrap;
        }
        .cx-brand {
          font-family: var(--font-heading), sans-serif;
          font-weight: 800;
          font-size: 18px;
        }
        .cx-navlinks {
          display: flex;
          gap: 26px;
          font-size: 14px;
          color: var(--db-muted);
        }
        .cx-navlinks :global(a) {
          color: inherit;
        }
        .cx-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .cx-theme-toggle {
          padding: 8px 12px !important;
          font-size: 13px !important;
        }
        .cx-nav-login {
          padding: 8px 14px !important;
          font-size: 13px !important;
        }
        .cx-nav-cta {
          padding: 9px 16px !important;
          font-size: 13px !important;
        }

        .cx-hero {
          max-width: 1000px;
          align-items: center;
          text-align: center;
          padding-top: 80px;
          padding-bottom: 40px;
        }
        .cx-hero-h1 {
          max-width: 820px;
        }
        .cx-hero-copy {
          max-width: 640px;
          font-size: 18px;
          line-height: 1.6;
          color: var(--db-muted);
          margin: 0;
        }
        .cx-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          max-width: 440px;
        }
        .cx-hero-primary {
          flex: 1 1 200px;
        }
        .cx-hero-secondary {
          flex: 1 1 140px;
        }
        .cx-hero-note {
          font-size: 12.5px;
          color: var(--db-muted2);
        }

        .cx-section-head {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cx-eyebrow {
          font-size: 12px;
          color: var(--db-accent);
          letter-spacing: 0.08em;
        }
        .cx-section-sub {
          margin: 0;
          max-width: 680px;
          font-size: 15.5px;
          line-height: 1.6;
          color: var(--db-muted);
        }

        .cx-problem-card {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .cx-problem-before {
          font-size: 13px;
          color: var(--db-muted2);
          text-decoration: line-through;
        }
        .cx-problem-after {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.45;
        }

        .cx-specialty-row {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }
        .cx-mock-card {
          padding: 0;
          overflow: hidden;
        }
        .cx-mock-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-bottom: 1px solid var(--db-border);
          background: color-mix(in srgb, var(--db-text) 4%, transparent);
          flex-wrap: wrap;
        }
        .cx-dot-warn {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--db-warn);
        }
        .cx-dot-muted {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--db-muted2);
        }
        .cx-dot-accent {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--db-accent);
        }
        .cx-mock-subdomain {
          margin-left: 8px;
          font-size: 12px;
          color: var(--db-muted2);
          word-break: break-all;
        }
        .cx-mock-body {
          padding: 22px;
          gap: 18px;
        }
        .cx-mock-left {
          display: flex;
          flex-direction: column;
          gap: 9px;
          min-width: 0;
        }
        .cx-mock-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--db-muted2);
        }
        .cx-mock-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--db-border);
          font-size: 13.5px;
        }
        .cx-mock-row-a {
          min-width: 0;
        }
        .cx-mock-row-b {
          color: var(--db-muted);
          flex: none;
        }
        .cx-mock-side {
          background: color-mix(in srgb, var(--db-accent) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--db-accent) 30%, transparent);
          border-radius: 12px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          align-self: start;
        }
        .cx-mock-side-value {
          font-size: 24px;
          color: var(--db-accent);
          word-break: break-word;
        }
        .cx-mock-side-sub {
          font-size: 12.5px;
          color: var(--db-muted);
        }

        .cx-feature-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cx-feature-name {
          font-size: 16.5px;
        }
        .cx-feature-desc {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--db-muted);
        }

        .cx-compliance-card {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .cx-compliance-tag {
          flex: none;
          color: var(--db-accent);
          font-size: 13px;
          padding-top: 2px;
        }
        .cx-compliance-body {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .cx-compliance-name {
          font-size: 15.5px;
        }
        .cx-compliance-desc {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.5;
          color: var(--db-muted);
        }

        .cx-role-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cx-role-name {
          font-size: 16px;
        }
        .cx-role-desc {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--db-muted);
        }

        .cx-subdomain-card {
          max-width: 460px;
        }
        .cx-subdomain-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--db-muted2);
        }
        .cx-subdomain-input {
          width: 100%;
          background: var(--db-bg);
          border: 1px solid var(--db-border);
          border-radius: 9px;
          padding: 11px 12px;
          color: var(--db-text);
          font-size: 13.5px;
          margin-top: 9px;
          box-sizing: border-box;
        }
        .cx-subdomain-preview {
          font-size: 13px;
          color: var(--db-accent);
          margin-top: 9px;
          word-break: break-all;
        }

        .cx-pricing-grid {
          align-items: start;
        }
        .cx-pricing-controls {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cx-annual-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .cx-annual-label {
          font-size: 13.5px;
          color: var(--db-muted);
        }
        .cx-annual-discount {
          color: var(--db-accent);
        }
        .cx-annual-toggle {
          width: 46px;
          height: 26px;
          border-radius: 13px;
          border: none;
          position: relative;
          cursor: pointer;
          flex: none;
        }
        .cx-annual-knob {
          position: absolute;
          top: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--db-bg);
          transition: left 0.18s;
        }
        .cx-clinic-slider {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .cx-clinic-count-label {
          font-size: 13px;
          color: var(--db-muted2);
        }
        .cx-pricing-list {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 13.5px;
          color: var(--db-muted);
          line-height: 1.5;
        }
        .cx-tier-card {
          border-color: var(--db-accent);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cx-tier-name {
          font-size: 13px;
          color: var(--db-muted2);
        }
        .cx-tier-price {
          font-size: 34px;
          color: var(--db-accent);
          line-height: 1.1;
        }
        .cx-tier-note {
          font-size: 12.5px;
          color: var(--db-muted);
        }
        .cx-tier-cta {
          width: 100%;
          box-sizing: border-box;
          margin-top: 4px;
        }

        .cx-trust-copy {
          margin: 0;
          font-size: 13.5px;
          color: var(--db-muted);
          max-width: 720px;
          line-height: 1.6;
        }

        .cx-faq-section {
          max-width: 900px;
        }
        .cx-faq-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cx-faq-item {
          cursor: pointer;
        }
        .cx-faq-row {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: baseline;
        }
        .cx-faq-q {
          font-weight: 600;
          font-size: 15px;
          line-height: 1.4;
        }
        .cx-faq-icon {
          color: var(--db-muted2);
          flex: none;
        }
        .cx-faq-a {
          color: var(--db-muted);
          font-size: 13.5px;
          margin: 10px 0 0;
          line-height: 1.55;
        }

        .cx-cta-section {
          max-width: 860px;
          align-items: center;
          text-align: center;
          background: radial-gradient(
            ellipse at center,
            color-mix(in srgb, var(--db-accent) 13%, transparent),
            transparent 70%
          );
          border-radius: 20px;
        }
        .cx-cta-copy {
          margin: 0;
          font-size: 15.5px;
          color: var(--db-muted);
          max-width: 520px;
          line-height: 1.6;
        }
        .cx-cta-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          max-width: 420px;
        }
        .cx-cta-primary {
          flex: 1 1 180px;
        }
        .cx-cta-secondary {
          flex: 1 1 140px;
        }

        .cx-footer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
          border-top: 1px solid var(--db-border);
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          font-size: 12.5px;
          color: var(--db-muted2);
        }
        .cx-footer-links {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
        }
        .cx-footer :global(a) {
          color: var(--db-muted2);
        }

        @media (max-width: 1000px) {
          .cx-landing :global(.h1) {
            font-size: 44px;
          }
          .cx-landing :global(.h2) {
            font-size: 27px;
          }
          .cx-landing :global(.sec) {
            padding: 48px 32px;
          }
          .cx-landing :global(.grid3),
          .cx-landing :global(.grid4) {
            grid-template-columns: repeat(2, 1fr);
          }
          .cx-navlinks {
            order: 3;
            width: 100%;
            gap: 18px;
            font-size: 13px;
            overflow-x: auto;
            padding-top: 4px;
          }
          .cx-navlinks :global(a) {
            white-space: nowrap;
          }
        }
        @media (max-width: 640px) {
          .cx-landing :global(.h1) {
            font-size: 34px;
          }
          .cx-landing :global(.h2) {
            font-size: 23px;
          }
          .cx-landing :global(.sec) {
            padding: 40px 20px;
            gap: 18px;
          }
          .cx-landing :global(.grid3),
          .cx-landing :global(.grid4),
          .cx-landing :global(.grid2) {
            grid-template-columns: 1fr;
          }
          .cx-landing :global(.btn-jade),
          .cx-landing :global(.btn-ghost) {
            width: 100%;
            box-sizing: border-box;
          }
          .cx-landing :global(.card) {
            padding: 18px;
          }
        }
      `}</style>
    </div>
  );
}
