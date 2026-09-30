/**
 * Shared frame for Clinix PH's transactional email.
 *
 * Email clients ignore Tailwind and most external CSS, so this is the one
 * place inline styles are correct: table layout, inline styles, and a small
 * <style> block only for dark mode and the phone breakpoint (clients that
 * strip it still get a fully styled light email).
 */

const BRAND = {
  teal: "#0f766e",
  tealLight: "#5eead4",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  page: "#f8fafc",
  card: "#ffffff",
  well: "#f1f5f9",
} as const;

// Plus Jakarta Sans / Inter are the product fonts, but almost no mail client
// has them installed, so each stack ends in a font every client does have.
const HEADING_FONT = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";
const BODY_FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO_FONT = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for HTML bodies and attribute values. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export type ActionEmail = {
  /** Inbox preview text; shown next to the subject, hidden in the body. */
  preheader: string;
  heading: string;
  /** Plain strings — escaped here, so callers never pre-escape. */
  paragraphs: string[];
  action: { label: string; url: string };
  /** Small print under the button: expiry, and "wasn't you?" reassurance. */
  footnote: string;
};

export type RenderedEmail = { html: string; text: string };

// Invisible filler stops the client from pulling body copy into the preview.
const PREHEADER_PADDING = "&#847;&zwnj;&nbsp;".repeat(40);

export function renderActionEmail({ preheader, heading, paragraphs, action, footnote }: ActionEmail): RenderedEmail {
  const url = escapeHtml(action.url);

  const paragraphHtml = paragraphs
    .map(
      (paragraph) =>
        `<p class="text" style="margin:0 0 14px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${BRAND.body};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(heading)}</title>
<style>
@media (max-width:620px){
  .px{padding-left:24px!important;padding-right:24px!important}
  .h1{font-size:22px!important}
  .btn{width:100%!important}
  .btn a{display:block!important;text-align:center!important}
}
@media (prefers-color-scheme:dark){
  body,.page{background:#0b1220!important}
  .card{background:#111827!important;border-color:#1f2937!important}
  .h1{color:#f8fafc!important}
  .text{color:#cbd5e1!important}
  .muted{color:#94a3b8!important}
  .well{background:#0f172a!important;border-color:#1f2937!important}
  .rule{border-color:#1f2937!important}
  .link{color:${BRAND.tealLight}!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}${PREHEADER_PADDING}</div>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden;">
    <tr><td bgcolor="${BRAND.teal}" class="px" style="background:${BRAND.teal};padding:22px 40px;font-family:${HEADING_FONT};font-size:20px;font-weight:800;letter-spacing:-0.01em;color:#ffffff;">Clinix PH</td></tr>
    <tr><td class="px" style="padding:36px 40px 8px;">
      <h1 class="h1" style="margin:0 0 16px;font-family:${HEADING_FONT};font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">${escapeHtml(heading)}</h1>
      ${paragraphHtml}
    </td></tr>
    <tr><td class="px" style="padding:10px 40px 8px;">
      <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${BRAND.teal}" style="background:${BRAND.teal};border-radius:10px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${HEADING_FONT};font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(action.label)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td class="px" style="padding:22px 40px 8px;">
      <table role="presentation" class="well" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.well};border:1px solid ${BRAND.line};border-radius:10px;">
        <tr><td style="padding:14px 16px;">
          <p class="muted" style="margin:0 0 6px;font-family:${BODY_FONT};font-size:12px;line-height:1.4;color:${BRAND.muted};">Button not working? Paste this link into your browser:</p>
          <a class="link" href="${url}" style="font-family:${MONO_FONT};font-size:12px;line-height:1.5;color:${BRAND.teal};word-break:break-all;text-decoration:underline;">${url}</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td class="px" style="padding:18px 40px 32px;">
      <p class="muted" style="margin:0;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(footnote)}</p>
    </td></tr>
    <tr><td class="px rule" style="padding:18px 40px;border-top:1px solid ${BRAND.line};">
      <p class="muted" style="margin:0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${BRAND.muted};">Clinix PH by DataBridgeSol &middot; You're receiving this because this address was used on Clinix PH.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    ...paragraphs,
    `${action.label}:\n${action.url}`,
    footnote,
    "— Clinix PH by DataBridgeSol",
  ].join("\n\n");

  return { html, text };
}
