import { z } from "zod";

export const invitePatientSchema = z.object({
  patientId: z.uuid(),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address.")),
});
export type InvitePatientField = "email";
