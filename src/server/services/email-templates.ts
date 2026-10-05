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

export function composePatientInviteEmail(clinicName: string, url: string): ComposedEmail {
  return {
    subject: `${clinicName} invited you to see your visits online`,
    ...renderActionEmail({
      preheader: `See your appointments and receipts from ${clinicName}.`,
      heading: `Your records at ${clinicName}`,
      paragraphs: [
        "Hi there,",
        `${clinicName} invited you to a secure page where you can see your upcoming appointments, past visits and receipts. You can only view them there; to change anything, contact the clinic.`,
      ],
      action: { label: "Set up my access", url },
      footnote: "This link expires in 7 days and works once. If you weren't expecting it, ignore this email — nothing happens until you use it.",
    }),
  };
}

export function composeAppointmentReminderEmail(clinic: { name: string; phone: string | null }, when: string, service: string | null, url: string): ComposedEmail {
  return {
    subject: `Reminder: your appointment at ${clinic.name}`,
    ...renderActionEmail({
      preheader: `Your appointment is on ${when}.`,
      heading: "Appointment reminder",
      paragraphs: [
        "Hi there,",
        `This is a reminder of your appointment at ${clinic.name} on ${when}${service ? ` (${service})` : ""}.`,
        clinic.phone ? `Need to change it? Please contact the clinic at ${clinic.phone}.` : "Need to change it? Please contact the clinic.",
      ],
      action: { label: "View clinic", url },
      footnote: "You receive this because the clinic has your email for appointment reminders. Ask the clinic to remove it if you'd rather not.",
    }),
  };
}

export function composeRecallEmail(clinic: { name: string; phone: string | null }, reason: string | null, url: string): ComposedEmail {
  return {
    subject: `Time for your next visit at ${clinic.name}`,
    ...renderActionEmail({
      preheader: `It's time to book your next visit at ${clinic.name}.`,
      heading: "Time for your next visit",
      paragraphs: [
        "Hi there,",
        `${clinic.name} would like to see you again${reason ? ` for ${reason.toLowerCase()}` : ""}. Regular visits keep small problems small.`,
        clinic.phone ? `To book, please call us at ${clinic.phone}.` : "To book, please contact the clinic.",
      ],
      action: { label: "View clinic", url },
      footnote: "You receive this because the clinic has your email for visit reminders. Ask the clinic to remove it if you'd rather not.",
    }),
  };
}
