import type { AgentProvider, AgentResult, ProviderRunInput } from "../core";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";

/** Gemini first, Claude second: whichever have keys, in that order. */
export function configuredProviders(): AgentProvider[] {
  return [geminiProvider(), anthropicProvider()].filter((provider) => provider.configured());
}

export type ChainResult = AgentResult & { provider: AgentProvider["id"]; model: string };

/**
 * Asks each configured provider in turn. A provider that throws (quota, outage,
 * bad key) hands over to the next; a refusal or a finished answer ends the chain.
 * Throws only when every provider failed.
 */
export async function runProviderChain(providers: AgentProvider[], input: ProviderRunInput): Promise<ChainResult> {
  let lastError: unknown;
  for (const provider of providers) {
    try {
      return { ...(await provider.run(input)), provider: provider.id, model: provider.model };
    } catch (error) {
      lastError = error;
      console.error(`[agent] ${provider.id} failed, trying the next layer:`, error instanceof Error ? error.message : "unknown error");
    }
  }
  throw lastError ?? new Error("No AI provider is configured.");
}
