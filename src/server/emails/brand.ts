/**
 * Brand tokens for transactional email. Email clients ignore stylesheets and
 * CSS variables, so these mirror the Clinix PH values in app/globals.css
 * (--color-brand, --color-brand-700) as literal hex — keep the two in sync.
 */
export const MAIL_BRAND = {
  colors: {
    background: "#f8fafc",
    surface: "#ffffff",
    foreground: "#0f172a",
    muted: "#475569",
    subtle: "#64748b",
    border: "#e2e8f0",
    well: "#f1f5f9",
    accent: "#0f766e",
    accentDark: "#0a4f49",
    accentForeground: "#ffffff",
  },
  fonts: {
    display: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",
    body: "Inter, 'Segoe UI', Arial, sans-serif",
  },
} as const;

export const MAIL_COMPANY = {
  productName: "Clinix PH",
  companyName: "DataBridgeSol",
  tagline: "Clinic management for Philippine practices",
} as const;
