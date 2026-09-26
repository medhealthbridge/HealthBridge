import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/src/server/auth";

// OAuth callbacks and better-auth's own endpoints. App mutations go through
// Server Actions in src/server/actions/, not through here.
export const { GET, POST } = toNextJsHandler(auth);
