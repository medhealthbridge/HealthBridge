import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/** One thing the assistant may do. `run` gets already-validated input and nothing else: no tenant, user or SQL from the model. */
export type AgentTool = {
  name: string;
  description: string;
  input: z.ZodType;
  run: (input: never) => Promise<unknown>;
};

/** Keeps `run`'s input typed from the Zod schema at the definition site. */
export function defineTool<S extends z.ZodType>(tool: {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<S>) => Promise<unknown>;
}): AgentTool {
  return tool as AgentTool;
}

export type AgentTurn = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  text: string;
  steps: number;
  usage: { inputTokens: number; outputTokens: number };
  stopped: "done" | "step_limit" | "refused" | "truncated";
};

type AgentClient = Pick<Anthropic, "messages">;

type RunAgentOptions = {
  client: AgentClient;
  model: string;
  system: string;
  tools: AgentTool[];
  history: AgentTurn[];
  /** Model calls allowed in one request, so a confused loop can't run up a bill. */
  maxSteps?: number;
  maxTokens?: number;
  /** Called with the tool's name only; never its input or output. */
  onToolCall?: (name: string) => void;
};

const MAX_RESULT_CHARS = 20_000;

/**
 * What the model sees of a tool's output. It is wrapped as data so text inside
 * it (a tenant's name, a clinic note) is never mistaken for an instruction.
 */
function asToolContent(value: unknown) {
  const json = JSON.stringify(value ?? null);
  const body = json.length > MAX_RESULT_CHARS ? `${json.slice(0, MAX_RESULT_CHARS)}…[truncated]` : json;
  return `<tool_data>${body}</tool_data>`;
}

/**
 * The tool-calling loop. Stateless: the caller passes the visible conversation
 * (text only) each time, and tool calls made here are not carried between
 * requests. Tenant and user scoping is the tools' job, set up by the caller.
 */
export async function runAgent({ client, model, system, tools, history, maxSteps = 8, maxTokens = 16_000, onToolCall }: RunAgentOptions): Promise<AgentResult> {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const toolDefs: Anthropic.Tool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: z.toJSONSchema(tool.input) as Anthropic.Tool["input_schema"],
  }));

  const messages: Anthropic.MessageParam[] = history.map((turn) => ({ role: turn.role, content: turn.content }));
  const usage = { inputTokens: 0, outputTokens: 0 };

  for (let step = 1; step <= maxSteps; step++) {
    const response = await client.messages
      .stream({ model, max_tokens: maxTokens, system, tools: toolDefs, messages, output_config: { effort: "medium" } })
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
      const tool = byName.get(block.name);
      const parsed = tool?.input.safeParse(block.input);
      if (!tool || !parsed?.success) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Unknown tool or invalid arguments." });
        continue;
      }
      try {
        results.push({ type: "tool_result", tool_use_id: block.id, content: asToolContent(await tool.run(parsed.data as never)) });
      } catch (error) {
        // The detail stays in our logs; the model only learns that it failed.
        console.error(`[agent] tool ${tool.name} failed:`, error instanceof Error ? error.message : "unknown error");
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "That lookup failed. Tell the user it is unavailable." });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", steps: maxSteps, usage, stopped: "step_limit" };
}
