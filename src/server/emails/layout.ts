import { MAIL_BRAND, MAIL_COMPANY } from "./brand";

/** What every template returns and `sendEmail` sends. */
export type EmailContent = { subject: string; text: string; html: string };

type TransactionalEmail = {
  /** Inbox preview line, shown after the subject; hidden in the body. */
  preheader: string;
  heading: string;
  /** Plain-text paragraphs — escaped here, so they can't carry markup. */
  paragraphs: string[];
  cta?: { label: string; href: string };
  footnote?: string;
};

const EMAIL_WIDTH = 600;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

const { colors, fonts } = MAIL_BRAND;

function ctaBlock(cta: { label: string; href: string }) {
  const href = escapeHtml(cta.href);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0 8px;">
      <tr>
        <td align="center">
          <a href="${href}" style="display:inline-block;background-color:${colors.accent};color:${colors.accentForeground};font-family:${fonts.display};font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:16px 32px;border-radius:10px;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${colors.subtle};word-break:break-all;">
      Button not working? Paste this link into your browser:<br />
      <a href="${href}" style="color:${colors.accent};text-decoration:underline;">${href}</a>
    </p>`;
}

/**
 * The one HTML shell every Clinix PH email uses: table layout and inline
 * styles because that's what email clients reliably render. Each template
 * passes plain strings; everything interpolated is escaped here.
 */
export function buildTransactionalEmail(email: TransactionalEmail) {
  const paragraphs = email.paragraphs
    .map((text) => `<p style="margin:0 0 14px;">${escapeHtml(text)}</p>`)
    .join("");
  const footnote = email.footnote
    ? `<p style="margin:28px 0 0;font-size:12px;line-height:1.65;color:${colors.subtle};">${escapeHtml(email.footnote)}</p>`
    : "";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(email.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.background};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(email.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${colors.background};">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${EMAIL_WIDTH}" style="max-width:${EMAIL_WIDTH}px;width:100%;background-color:${colors.surface};border:1px solid ${colors.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:22px 40px;background-color:${colors.accent};background-image:linear-gradient(160deg,${colors.accent},${colors.accentDark});">
              <p style="margin:0;font-family:${fonts.display};font-size:20px;font-weight:800;color:${colors.accentForeground};">${escapeHtml(MAIL_COMPANY.productName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 36px;">
              <h1 style="margin:0 0 20px;font-family:${fonts.display};font-size:26px;font-weight:800;line-height:1.25;color:${colors.foreground};">${escapeHtml(email.heading)}</h1>
              <div style="font-family:${fonts.body};font-size:16px;line-height:1.65;color:${colors.muted};">
                ${paragraphs}
                ${email.cta ? ctaBlock(email.cta) : ""}
                ${footnote}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 26px;background-color:${colors.well};border-top:1px solid ${colors.border};font-family:${fonts.body};font-size:11px;line-height:1.5;color:${colors.subtle};text-align:center;">
              &copy; ${year} ${escapeHtml(MAIL_COMPANY.companyName)} &middot; ${escapeHtml(MAIL_COMPANY.tagline)}<br />
              This is an automated message — replies aren't monitored.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
