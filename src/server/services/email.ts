import { composePasswordResetEmail, composeVerificationEmail } from "./email-templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends through Resend's HTTP API. A rejection is logged with Resend's own
 * reason (e.g. unverified sender domain) and the subject — never the body,
 * which holds a sign-in token — then rethrown.
 */
async function sendEmail(to: string, email: EmailContent) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM.");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], ...email }),
  });
  if (response.ok) return;

  const error: { name?: string; message?: string } = await response.json().catch(() => ({}));
  const reason = redactEmails(error.message ?? "no reason given");
  console.error(`[email] "${email.subject}" rejected by Resend (HTTP ${response.status}, ${error.name}): ${reason}`);
  throw new Error(`Email provider rejected the message (HTTP ${response.status}).`);
}

export async function sendVerificationEmail(recipient: { name: string; email: string }, url: string) {
  await sendEmail({ to: recipient.email, ...composeVerificationEmail(recipient, url) });
}

export async function sendPasswordResetEmail(recipient: { name: string; email: string }, url: string) {
  await sendEmail({ to: recipient.email, ...composePasswordResetEmail(recipient, url) });
}
