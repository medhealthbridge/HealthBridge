import { composePasswordResetEmail, composeVerificationEmail } from "./email-templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Email = { to: string; subject: string; text: string; html: string };

/** Sends through Resend's HTTP API. Errors never include the message body, which may hold a token. */
async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM.");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...email }),
  });
  if (!response.ok) {
    // Resend explains itself in the body — an unverified sender domain, a
    // test sender writing to someone other than the account owner, a bad key.
    // The status code alone sends you to the dashboard to find out which, so
    // keep the reason. It describes the rejection, never the message we sent,
    // so no verification or reset token can ride along.
    const reason = await response.text().catch(() => "");
    throw new Error(
      `Email provider rejected the message (HTTP ${response.status})${reason ? `: ${reason.slice(0, 300)}` : "."}`,
    );
  }
}

export async function sendVerificationEmail(recipient: { name: string; email: string }, url: string) {
  await sendEmail({ to: recipient.email, ...composeVerificationEmail(recipient, url) });
}

export async function sendPasswordResetEmail(recipient: { name: string; email: string }, url: string) {
  await sendEmail({ to: recipient.email, ...composePasswordResetEmail(recipient, url) });
}
