import { buildTransactionalEmail, type EmailContent } from "./layout";

// better-auth's default emailVerification.expiresIn is one hour.
const FOOTNOTE = "This link expires in 1 hour. If you didn't sign up for Clinix PH, you can ignore this email.";

export function verifyEmailTemplate({ name, url }: { name: string; url: string }): EmailContent {
  const greeting = `Hi ${name},`;
  const body = "Confirm your email to finish setting up your Clinix PH account and start your free trial.";

  return {
    subject: "Verify your email for Clinix PH",
    text: [greeting, "", body, "", url, "", FOOTNOTE].join("\n"),
    html: buildTransactionalEmail({
      preheader: "Confirm your email to finish setting up Clinix PH.",
      heading: "Verify your email",
      paragraphs: [greeting, body],
      cta: { label: "Verify email", href: url },
      footnote: FOOTNOTE,
    }),
  };
}
