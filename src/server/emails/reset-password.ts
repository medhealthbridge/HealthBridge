import { buildTransactionalEmail, type EmailContent } from "./layout";

const FOOTNOTE =
  "This link expires in 1 hour and works once. If you didn't ask for it, you can ignore this email — your password stays as it is.";

export function resetPasswordTemplate({ name, url }: { name: string; url: string }): EmailContent {
  const greeting = `Hi ${name},`;
  const body = "We got a request to reset your Clinix PH password. Open the link below to choose a new one.";

  return {
    subject: "Reset your Clinix PH password",
    text: [greeting, "", body, "", url, "", FOOTNOTE].join("\n"),
    html: buildTransactionalEmail({
      preheader: "Use the secure link inside to set a new password.",
      heading: "Reset your password",
      paragraphs: [greeting, body],
      cta: { label: "Reset password", href: url },
      footnote: FOOTNOTE,
    }),
  };
}
