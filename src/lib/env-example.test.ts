import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// T-003: every variable in docs/TRD.md section 4 is listed in .env.example.
const REQUIRED = [
  "DATABASE_URL", "DATABASE_ADMIN_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL",
  "RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET", "CLINIC_SUBDOMAINS",
  "NEXT_PUBLIC_CLINIX_URL", "PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET",
  "SUBSCRIPTION_RETURN_BASE_URL", "XENDIT_SECRET_KEY", "XENDIT_CALLBACK_TOKEN",
  "VERCEL_API_TOKEN", "VERCEL_TEAM_ID", "VERCEL_PROJECT_ID", "DOMAIN_REGISTRANT",
  "USD_PHP_RATE", "DOMAIN_MARGIN", "GEMINI_API_KEY", "ANTHROPIC_API_KEY",
  "GEMINI_MODEL", "ADMIN_AGENT_MODEL", "AGENT_DAILY_AI_LIMIT", "AI_MONTHLY_CAP_DEFAULT",
  "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_NAME", "SUPER_ADMIN_PASSWORD", "DEMO_PASSWORD",
  "SENTRY_DSN", "ALERT_EMAIL",
];

describe(".env.example", () => {
  it("lists every variable the blueprint requires", () => {
    const text = readFileSync(".env.example", "utf8");
    const missing = REQUIRED.filter((name) => !new RegExp(`^#?\\s*${name}=`, "m").test(text));
    expect(missing).toEqual([]);
  });
});
