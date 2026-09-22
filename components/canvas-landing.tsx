"use client";

import { useState } from "react";

type Product = {
  key: string;
  name: string;
  desc: string;
  live: boolean;
  href?: string;
};

type Faq = { q: string; a: string };

const PRODUCTS: Product[] = [
  {
    key: "clinix",
    name: "Clinix PH — Dental & Medical",
    desc: "Multi-branch clinic management: records, scheduling, POS, inventory and role-based access for owners, practitioners and staff.",
    live: true,
    href: "https://clinix.databridgesol.space",
  },
  {
    key: "pos",
    name: "Point of Sale",
    desc: "Standalone checkout, multi-payment, receipts and daily sales reporting for any storefront.",
    live: false,
  },
  {
    key: "inventory",
    name: "Inventory",
    desc: "Multi-branch stock tracking, transfers and low-stock alerts as a standalone module.",
    live: false,
  },
  {
    key: "records",
    name: "Records",
    desc: "A searchable client/records system for any service business — no clinic assumptions required.",
    live: false,
  },
  {
    key: "guesthouse",
    name: "Guesthouse / Stay Booking",
    desc: "Rooms, reservations and check-in/check-out for small lodgings and guesthouses.",
    live: false,
  },
  {
    key: "more",
    name: "More verticals",
    desc: "Salons, repair shops, gyms — tell us what you run and we'll scope the modules you need.",
    live: false,
  },
];

const FAQS: Faq[] = [
  {
    q: "Is Clinix PH the only live product?",
    a: "Yes — dental & medical clinics are our first shipped vertical. Other modules below are in development.",
  },
  {
    q: "Can I use just one module, like POS?",
    a: "Yes — every module is designed to run standalone or combined into a full product.",
  },
  {
    q: "Is my data isolated per client?",
    a: "Every workspace is isolated at the database level, encrypted in transit and at rest, with full audit logs.",
  },
  {
    q: "What happens if a trial ends or payment fails?",
    a: "Access pauses behind a reactivation screen. Nothing is ever deleted.",
  },
  {
    q: "How do I request a module we don't offer yet?",
    a: 'Use "Notify me" on any coming-soon card, or tell us your business type on the More Verticals card.',
  },
];

export default function CanvasLanding() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [subdomainName, setSubdomainName] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const subdomainPreview = `${subdomainName || "yourbusiness"}.databridgesol.space`;

  return (
    <div className="db-landing" data-theme={theme}>
      <nav className="db-nav">
        <span className="db-brand">DataBridgeSol</span>
        <div className="db-nav-links">
          <a href="#products">Products</a>
          <a href="#modular">How it works</a>
          <a href="#security">Security</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="db-nav-actions">
          <button
            type="button"
            className="btn-ghost db-theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "☾ Dark" : "☀ Light"}
          </button>
          <a href="#products" className="btn-jade db-nav-cta">
            See products
          </a>
        </div>
      </nav>

      <section className="db-hero">
        <span className="pill db-pill-static">
          <span className="db-dot" />
          Modular business software, one workspace per client
        </span>
        <h1>Pick the module your business needs. Skip the rest.</h1>
        <p className="db-hero-copy">
          DataBridgeSol builds records, POS, inventory, and booking systems as
          standalone products or a full suite — each client gets an isolated
          workspace on its own subdomain. Dental &amp; medical clinics are
          live today; more verticals are on the way.
        </p>
        <div className="db-hero-actions">
          <a href="#products" className="btn-jade">
            Browse products →
          </a>
          <a href="#modular" className="btn-ghost">
            How it works
          </a>
        </div>
      </section>

      <section id="products" className="db-section">
        <h2>What we&apos;ve built so far.</h2>
        <div className="db-products-grid">
          {PRODUCTS.map((p) => (
            <div className="card db-product-card" key={p.key}>
              <div className="db-product-head">
                <h3>{p.name}</h3>
                <span className={p.live ? "badge-live" : "badge-soon"}>
                  {p.live ? "Live" : "Coming soon"}
                </span>
              </div>
              <p className="db-product-desc">{p.desc}</p>
              {p.live ? (
                <a href={p.href} className="btn-jade db-product-cta">
                  Open live demo →
                </a>
              ) : (
                <button
                  type="button"
                  className="btn-ghost db-product-cta"
                  disabled
                >
                  Notify me
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="modular" className="db-section">
        <h2>One engine. Composable modules.</h2>
        <div className="db-modular-grid">
          <div className="card">
            <h3>Records</h3>
            <p>Structured history &amp; documents for any vertical.</p>
          </div>
          <div className="card">
            <h3>Point of Sale</h3>
            <p>Multi-payment checkout, receipts, daily reports.</p>
          </div>
          <div className="card">
            <h3>Inventory</h3>
            <p>Real-time stock, transfers, low-stock alerts.</p>
          </div>
          <div className="card">
            <h3>Booking</h3>
            <p>Appointments, reservations, and queues.</p>
          </div>
        </div>
        <p className="db-modular-copy">
          Take one module standalone, or combine them into a full product
          like Clinix PH. Every client — one clinic, one POS counter, one
          guesthouse — runs on its own isolated workspace.
        </p>
      </section>

      <section className="db-section db-subdomain-section">
        <h2>Every client gets its own workspace.</h2>
        <div className="card db-subdomain-card">
          <span className="db-subdomain-label">Try your subdomain</span>
          <input
            className="mono db-subdomain-input"
            value={subdomainName}
            onChange={(e) =>
              setSubdomainName(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
              )
            }
            placeholder="yourbusiness"
          />
          <div className="mono db-subdomain-preview">{subdomainPreview}</div>
        </div>
      </section>

      <section id="security" className="db-section">
        <h2>What&apos;s on by default.</h2>
        <div className="db-security-grid">
          <div className="card">Encryption in transit &amp; at rest</div>
          <div className="card">
            Isolated data per client — row-level security
          </div>
          <div className="card">Full audit logs on every account</div>
        </div>
        <div className="db-security-note">
          If a trial ends or a payment fails, access pauses behind a
          reactivation screen. Records are never deleted.
        </div>
      </section>

      <section id="faq" className="db-section db-faq-section">
        <h2 className="db-faq-heading">Frequently asked</h2>
        {FAQS.map((f, i) => {
          const open = faqOpen === i;
          return (
            <div
              className="card db-faq-item"
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
              <div className="db-faq-row">
                <span className="db-faq-q">{f.q}</span>
                <span className="mono db-faq-icon">{open ? "−" : "+"}</span>
              </div>
              {open && <p className="db-faq-a">{f.a}</p>}
            </div>
          );
        })}
      </section>

      <section className="db-cta-section">
        <h2>Not sure which module fits? Start with what&apos;s live.</h2>
        <div className="db-cta-actions">
          <a href="https://clinix.databridgesol.space" className="btn-jade">
            Explore Clinix PH →
          </a>
          <a href="#products" className="btn-ghost">
            See all products
          </a>
        </div>
      </section>

      <footer className="db-footer">
        <span>© 2026 DataBridgeSol</span>
        <div className="db-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Data Processing</a>
        </div>
      </footer>

      <style jsx>{`
        .db-landing {
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
        .db-landing[data-theme="light"] {
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
        .db-landing :global(a) {
          color: var(--db-accent);
          text-decoration: none;
        }
        .db-landing :global(h1),
        .db-landing :global(h2),
        .db-landing :global(h3) {
          font-family: var(--font-heading), sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          color: var(--db-text);
        }
        .db-landing :global(.mono) {
          font-family: var(--font-mono), monospace;
        }
        .db-landing :global(.pill) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--db-border);
          background: var(--db-surface);
          font-size: 13px;
          color: var(--db-muted);
        }
        .db-landing :global(.db-pill-static) {
          cursor: default;
          border-color: var(--db-accent);
          color: var(--db-text);
          background: color-mix(in srgb, var(--db-accent) 10%, transparent);
        }
        .db-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--db-accent);
        }
        .db-landing :global(.card) {
          background: var(--db-surface);
          border: 1px solid var(--db-border);
          border-radius: 14px;
          padding: 22px;
          transition: border-color 0.15s ease;
        }
        .db-landing :global(.card:hover) {
          border-color: color-mix(in srgb, var(--db-accent) 40%, transparent);
        }
        .db-landing :global(.btn-jade) {
          background: var(--db-accent);
          color: var(--db-accent-ink);
          font-weight: 700;
          padding: 13px 22px;
          border-radius: 10px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          font-family: var(--font-body), sans-serif;
          font-size: 14px;
        }
        .db-landing :global(.btn-ghost) {
          border: 1px solid var(--db-border);
          color: var(--db-text);
          padding: 13px 22px;
          border-radius: 10px;
          text-decoration: none;
          display: inline-flex;
          background: transparent;
          cursor: pointer;
          font-family: var(--font-body), sans-serif;
          font-size: 14px;
        }
        .db-landing :global(.btn-ghost:disabled) {
          cursor: default;
        }
        .db-landing :global(.badge-soon) {
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--db-warn);
          border: 1px solid color-mix(in srgb, var(--db-warn) 45%, transparent);
          padding: 3px 8px;
          border-radius: 999px;
        }
        .db-landing :global(.badge-live) {
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--db-accent);
          border: 1px solid
            color-mix(in srgb, var(--db-accent) 45%, transparent);
          padding: 3px 8px;
          border-radius: 999px;
        }

        .db-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(10px);
          background: color-mix(in srgb, var(--db-bg) 82%, transparent);
          border-bottom: 1px solid var(--db-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 48px;
          gap: 16px;
        }
        .db-brand {
          font-family: var(--font-heading), sans-serif;
          font-weight: 800;
          font-size: 18px;
        }
        .db-nav-links {
          display: flex;
          gap: 28px;
          font-size: 14px;
          color: var(--db-muted);
        }
        .db-nav-links :global(a) {
          color: inherit;
        }
        .db-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .db-theme-toggle {
          padding: 8px 12px !important;
          font-size: 13px !important;
          background: none !important;
        }
        .db-nav-cta {
          padding: 9px 16px !important;
          font-size: 13px !important;
        }

        .db-hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 88px 48px 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 22px;
        }
        .db-hero :global(h1) {
          font-size: clamp(32px, 6vw, 58px);
          line-height: 1.02;
          max-width: 800px;
        }
        .db-hero-copy {
          max-width: 620px;
          font-size: 18px;
          line-height: 1.6;
          color: var(--db-muted);
        }
        .db-hero-actions {
          display: flex;
          gap: 14px;
        }

        .db-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 48px 56px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .db-section :global(h2) {
          font-size: 32px;
        }
        .db-products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .db-product-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .db-product-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .db-product-head :global(h3) {
          font-size: 17px;
        }
        .db-product-desc {
          color: var(--db-muted);
          font-size: 13.5px;
          line-height: 1.5;
          margin: 0;
          flex: 1;
        }
        .db-product-cta {
          justify-content: center;
          width: 100%;
          box-sizing: border-box;
        }
        .db-product-cta:disabled {
          opacity: 0.6;
        }

        .db-modular-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .db-modular-grid :global(h3) {
          font-size: 16px;
        }
        .db-modular-grid :global(p) {
          color: var(--db-muted);
          font-size: 13px;
          margin: 6px 0 0;
        }
        .db-modular-copy {
          max-width: 640px;
          color: var(--db-muted);
          font-size: 14.5px;
          line-height: 1.6;
        }

        .db-subdomain-section {
          padding-top: 0;
          gap: 16px;
        }
        .db-subdomain-section :global(h2) {
          font-size: 28px;
        }
        .db-subdomain-card {
          max-width: 460px;
        }
        .db-subdomain-label {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--db-muted2);
        }
        .db-subdomain-input {
          width: 100%;
          background: var(--db-bg);
          border: 1px solid var(--db-border);
          border-radius: 8px;
          padding: 9px 10px;
          color: var(--db-text);
          font-size: 13px;
          margin-top: 8px;
          box-sizing: border-box;
        }
        .db-subdomain-preview {
          font-size: 13px;
          color: var(--db-accent);
          margin-top: 8px;
        }

        .db-security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .db-security-note {
          font-size: 13.5px;
          color: var(--db-muted);
        }

        .db-faq-section {
          max-width: 900px;
        }
        .db-faq-heading {
          margin-bottom: 8px;
        }
        .db-faq-item {
          cursor: pointer;
        }
        .db-faq-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .db-faq-q {
          font-weight: 600;
          font-size: 15px;
        }
        .db-faq-icon {
          color: var(--db-muted2);
        }
        .db-faq-a {
          color: var(--db-muted);
          font-size: 13.5px;
          margin: 10px 0 0;
          line-height: 1.5;
        }

        .db-cta-section {
          max-width: 1000px;
          margin: 0 auto;
          padding: 16px 48px 56px;
          text-align: center;
          background: radial-gradient(
            ellipse at center,
            color-mix(in srgb, var(--db-accent) 14%, transparent),
            transparent 70%
          );
          border-radius: 20px;
        }
        .db-cta-section :global(h2) {
          font-size: 32px;
          margin-bottom: 14px;
        }
        .db-cta-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .db-footer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 48px;
          border-top: 1px solid var(--db-border);
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12.5px;
          color: var(--db-muted2);
        }
        .db-footer-links {
          display: flex;
          gap: 20px;
        }
        .db-footer :global(a) {
          color: var(--db-muted2);
        }

        @media (max-width: 900px) {
          .db-products-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .db-modular-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 760px) {
          .db-nav {
            padding: 14px 20px;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .db-nav-links {
            order: 2;
            width: 100%;
            gap: 16px;
            overflow-x: auto;
          }
          .db-nav-actions {
            order: 3;
            justify-content: space-between;
          }
          .db-hero {
            padding: 56px 20px 40px;
          }
          .db-section,
          .db-cta-section {
            padding-left: 20px;
            padding-right: 20px;
          }
          .db-security-grid {
            grid-template-columns: 1fr;
          }
          .db-footer {
            padding: 28px 20px;
          }
        }
        @media (max-width: 600px) {
          .db-products-grid,
          .db-modular-grid {
            grid-template-columns: 1fr;
          }
          .db-hero-actions,
          .db-cta-actions {
            flex-direction: column;
            width: 100%;
          }
          .db-hero-actions :global(a),
          .db-cta-actions :global(a) {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
