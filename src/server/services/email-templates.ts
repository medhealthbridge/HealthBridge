import { TRIAL_DAYS } from "@/src/lib/constants";
import { renderActionEmail, type RenderedEmail } from "./email-layout";

type Recipient = { name: string; email: string };

export type ComposedEmail = RenderedEmail & { subject: string };

// Both links are valid for one hour: better-auth's default for verification
// links, and `resetPasswordTokenExpiresIn`'s default for password resets.
const LINK_LIFETIME = "1 hour";

const greeting = (name: string) => `Hi ${name.trim() || "there"},`;

export function composeVerificationEmail(recipient: Recipient, url: string): ComposedEmail {
  return {
    subject: "Verify your email for Clinix PH",
    ...renderActionEmail({
      preheader: "Confirm your email to finish setting up your Clinix PH account.",
      heading: "Confirm your email",
      paragraphs: [
        greeting(recipient.name),
        `Thanks for signing up for Clinix PH. Confirm your email address to finish setting up your workspace and start your ${TRIAL_DAYS}-day free trial.`,
      ],
      action: { label: "Verify email", url },
      footnote: `This link expires in ${LINK_LIFETIME}. If you didn't create a Clinix PH account, you can ignore this email.`,
    }),
  };
}

export function composePasswordResetEmail(recipient: Recipient, url: string): ComposedEmail {
  return {
    subject: "Reset your Clinix PH password",
    ...renderActionEmail({
      preheader: `Choose a new password. The link expires in ${LINK_LIFETIME}.`,
      heading: "Reset your password",
      paragraphs: [
        greeting(recipient.name),
        "We received a request to reset the password for your Clinix PH account. Use the button below to choose a new one.",
      ],
      action: { label: "Reset password", url },
      footnote: `This link expires in ${LINK_LIFETIME} and works once. If you didn't ask for it, ignore this email — your password won't change.`,
    }),
  };
}

const INVITE_LIFETIME = "7 days";

export function composePlatformInviteEmail(inviter: { name: string }, email: string, url: string): ComposedEmail {
  return {
    subject: "You're invited to the DataBridgeSol admin",
    ...renderActionEmail({
      preheader: `${inviter.name} invited you to join the DataBridgeSol team.`,
      heading: "Join the DataBridgeSol team",
      paragraphs: [
        "Hi there,",
        `${inviter.name} invited ${email} to the DataBridgeSol company admin, where the team manages clients, billing and support. Use the button below to set up your access.`,
      ],
      action: { label: "Accept invitation", url },
      footnote: `This link expires in ${INVITE_LIFETIME} and works once. If you weren't expecting it, ignore this email — nothing happens until you accept.`,
    }),
  };
}

export function composeStaffInviteEmail(clinicName: string, inviterName: string, role: "assistant" | "practitioner", url: string): ComposedEmail {
  const roleLabel = role === "assistant" ? "front-desk assistant" : "practitioner";
  return {
    subject: `You're invited to ${clinicName} on Clinix PH`,
    ...renderActionEmail({
      preheader: `${inviterName} invited you to join ${clinicName} as ${roleLabel}.`,
      heading: `Join ${clinicName}`,
      paragraphs: [
        "Hi there,",
        `${inviterName} invited you to join ${clinicName} on Clinix PH as a ${roleLabel}. Use the button below to set up your access.`,
      ],
      action: { label: "Accept invitation", url },
      footnote: "This link expires in 7 days and works once. If you weren't expecting it, ignore this email — nothing happens until you accept.",
    }),
  };
}
