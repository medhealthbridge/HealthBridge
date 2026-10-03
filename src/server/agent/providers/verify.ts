import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { SecretKey } from "@/src/server/db/schema";

export type KeyCheck = "valid" | "invalid" | "unverified";

const REJECTED = new Set([400, 401, 403]);

function statusOf(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * One tiny request to learn whether a pasted key is accepted. Only a clear
 * rejection (400/401/403) is "invalid"; a quota, outage or network error says
 * nothing about the key, so it is "unverified" and the caller may still save.
 */
export async function verifyProviderKey(name: SecretKey, key: string): Promise<KeyCheck> {
  try {
    if (name === "gemini_api_key") {
      await new GoogleGenAI({ apiKey: key }).models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: "ping",
        config: { maxOutputTokens: 8 },
      });
    } else {
      await new Anthropic({ apiKey: key, maxRetries: 0 }).messages.create({
        model: process.env.ADMIN_AGENT_MODEL || "claude-opus-5-5",
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      });
    }
    return "valid";
  } catch (error) {
    const status = statusOf(error);
    return status !== undefined && REJECTED.has(status) ? "invalid" : "unverified";
  }
}
