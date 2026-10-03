import { configuredProviders, runProviderChain } from "./providers";
import type { AgentTool, AgentTurn, Proposal } from "./core";
import { dailyAiLimit, recordAgentUsage, usageToday } from "@/src/server/services/agent-usage";

export type AssistantReply = {
  reply: string;
  /** Who answered: the free rules, or an AI provider. */
  by: "rules" | "gemini" | "anthropic";
  proposals: Proposal[];
};

export type AssistantRun = {
  feature: string;
  userId: string;
  history: AgentTurn[];
  tools: AgentTool[];
  proposals: Proposal[];
  system: string;
  /** Free instant answers; null means "not mine, ask a model". */
  rules: (question: string, run: (tool: string, input?: unknown) => Promise<unknown>) => Promise<string | null>;
  /** Shown when only the rules layer is available. */
  noAiMessage: string;
  limitMessage: string;
};

/**
 * The three layers, cheapest first: instant rules (free), then Gemini, then Claude.
 * Every answer is logged as a usage row (layer and tokens only, never text).
 */
export async function runAssistant(input: AssistantRun): Promise<AssistantReply> {
  const { userId, feature, proposals } = input;
  const question = input.history.at(-1)?.content ?? "";

  const byRules = await input.rules(question, async (name, args) => {
    const tool = input.tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Unknown tool ${name}`);
    return tool.run(tool.input.parse(args ?? {}) as never);
  });
  if (byRules !== null) {
    await recordAgentUsage({ userId, feature, layer: "rule" });
    return { reply: byRules, by: "rules", proposals };
  }

  const providers = await configuredProviders();
  if (providers.length === 0) return { reply: input.noAiMessage, by: "rules", proposals };
  if ((await usageToday(userId, feature)).aiCalls >= dailyAiLimit()) return { reply: input.limitMessage, by: "rules", proposals };

  const result = await runProviderChain(providers, {
    system: input.system,
    tools: input.tools,
    history: input.history,
    onToolCall: (name) => console.info(`[agent] ${feature} tool ${name}`),
  });
  await recordAgentUsage({ userId, feature, layer: "ai", provider: result.provider, model: result.model, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens });
  console.info(`[agent] ${feature} ${result.provider} answered in ${result.steps} step(s), ${result.usage.inputTokens} in / ${result.usage.outputTokens} out, ${result.stopped}`);

  const reply =
    result.stopped === "refused" ? "I can't help with that request."
    : result.stopped === "step_limit" ? "That took too many steps. Try a narrower question."
    : result.text || "I don't have an answer for that.";
  return { reply, by: result.provider, proposals };
}

export async function aiLayerConfigured() {
  return (await configuredProviders()).length > 0;
}
