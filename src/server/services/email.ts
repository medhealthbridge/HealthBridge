const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Email = { to: string; subject: string; text: string; html: string };

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

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
  if (!response.ok) throw new Error(`Email provider rejected the message (HTTP ${response.status}).`);
}

export async function sendVerificationEmail(recipient: { name: string; email: string }, url: string) {
  await sendEmail({
    to: recipient.email,
    subject: "Verify your email for Clinix PH",
    text: `Hi ${recipient.name},\n\nConfirm your email to finish setting up your Clinix PH account:\n${url}\n\nIf you didn't sign up, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(recipient.name)},</p><p>Confirm your email to finish setting up your Clinix PH account:</p><p><a href="${escapeHtml(url)}">Verify email</a></p><p>If you didn't sign up, you can ignore this email.</p>`,
  });
}
