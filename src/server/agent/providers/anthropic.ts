import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runTool, type AgentProvider, type AgentResult, type ProviderRunInput } from "../core";

// Optional second layer; override with ADMIN_AGENT_MODEL.
const DEFAULT_MODEL = "claude-opus-5-5";

type AnthropicClient = Pick<Anthropic, "messages">;

/** The tool loop over Claude. Exported with an injectable client so tests can replay canned replies. */
export async function runAnthropicLoop(client: AnthropicClient, model: string, { system, tools, history, maxSteps = 8, onToolCall }: ProviderRunInput): Promise<AgentResult> {
  const toolDefs: Anthropic.Tool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.input) as Anthropic.Tool["input_schema"],
  }));
  const messages: Anthropic.MessageParam[] = history.map((turn) => ({ role: turn.role, content: turn.content }));
  const usage = { inputTokens: 0, outputTokens: 0 };

  for (let step = 1; step <= maxSteps; step++) {
    const response = await client.messages
      .stream({ model, max_tokens: 16_000, system, tools: toolDefs, messages, output_config: { effort: "medium" } })
      .finalMessage();
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;

    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n").trim();
    if (response.stop_reason === "refusal") return { text: "", steps: step, usage, stopped: "refused" };
    if (response.stop_reason === "max_tokens") return { text, steps: step, usage, stopped: "truncated" };
    if (response.stop_reason !== "tool_use") return { text, steps: step, usage, stopped: "done" };

    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      onToolCall?.(block.name);
      const { content, isError } = await runTool(tools, block.name, block.input);
      results.push({ type: "tool_result", tool_use_id: block.id, content, ...(isError && { is_error: true }) });
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", steps: maxSteps, usage, stopped: "step_limit" };
}

export function anthropicProvider(apiKey: string): AgentProvider {
  const model = process.env.ADMIN_AGENT_MODEL || DEFAULT_MODEL;
  return { id: "anthropic", model, run: (input) => runAnthropicLoop(new Anthropic({ apiKey }), model, input) };
}
