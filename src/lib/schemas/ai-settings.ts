import { z } from "zod";
import { SECRET_KEYS } from "@/src/server/db/schema/agent";

// Provider keys are a single token: no spaces or line breaks (a paste often drags one along).
export const saveKeySchema = z.object({
  name: z.enum(SECRET_KEYS),
  key: z
    .string()
    .trim()
    .min(20, "That looks too short to be an API key.")
    .max(300, "That looks too long to be an API key.")
    .regex(/^\S+$/, "An API key has no spaces or line breaks."),
});
export type SaveKeyField = "key";

export const removeKeySchema = z.object({ name: z.enum(SECRET_KEYS) });
