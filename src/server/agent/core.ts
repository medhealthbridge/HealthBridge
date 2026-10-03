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

/** A prepared change shown to the person with Confirm / Cancel. `stepUp` says what they must do first. */
export type Proposal = {
  id: string;
  summary: string;
  stepUp?: "none" | "unlock" | "password+typed";
  /** For deletes: the text the person must type back (the record's MRN). */
  phrase?: string;
};

export type AgentTurn = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  text: string;
  steps: number;
  usage: { inputTokens: number; outputTokens: number };
  stopped: "done" | "step_limit" | "refused" | "truncated";
};

export type ProviderRunInput = {
  system: string;
  tools: AgentTool[];
  history: AgentTurn[];
  /** Model calls allowed in one request, so a confused loop can't run up a bill. */
  maxSteps?: number;
  /** Called with the tool's name only; never its input or output. */
  onToolCall?: (name: string) => void;
};

/** A model behind the same tool loop. Throws on transport or quota errors so the next provider can answer. */
export type AgentProvider = {
  id: "gemini" | "anthropic";
  model: string;
  run: (input: ProviderRunInput) => Promise<AgentResult>;
};

const MAX_RESULT_CHARS = 20_000;
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/**
 * Hides most of every email address before text goes to an outside model: the
 * assistant can say "j***@clinic.ph" but a free-tier provider never holds the
 * full address. The rules layer, which calls no model, shows full addresses.
 */
export function redactEmails(text: string) {
  return text.replace(EMAIL, "$1***@$2");
}

/** What a model sees of a tool's output: redacted, size-capped, and labelled as data so text inside is never an instruction. */
export function asToolContent(value: unknown) {
  const json = redactEmails(JSON.stringify(value ?? null));
  return `<tool_data>${json.length > MAX_RESULT_CHARS ? `${json.slice(0, MAX_RESULT_CHARS)}…[truncated]` : json}</tool_data>`;
}

/** Validates the model's arguments, runs the tool, and hides failure detail from the model (it stays in our logs). */
export async function runTool(tools: AgentTool[], name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  const tool = tools.find((candidate) => candidate.name === name);
  const parsed = tool?.input.safeParse(input);
  if (!tool || !parsed?.success) return { content: "Unknown tool or invalid arguments.", isError: true };
  try {
    return { content: asToolContent(await tool.run(parsed.data as never)), isError: false };
  } catch (error) {
    console.error(`[agent] tool ${tool.name} failed:`, error instanceof Error ? error.message : "unknown error");
    return { content: "That lookup failed. Tell the user it is unavailable.", isError: true };
  }
}
