import { GoogleGenAI, type Content, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { runTool, type AgentProvider, type AgentResult, type ProviderRunInput } from "../core";

// First AI layer. Override with GEMINI_MODEL; check Google's current model list before changing the default.
const DEFAULT_MODEL = "gemini-2.5-flash";

type GeminiModels = Pick<GoogleGenAI, "models">;

/** The same tool loop over Gemini function calling. Injectable client for tests. */
export async function runGeminiLoop(ai: GeminiModels, model: string, { system, tools, history, maxSteps = 8, onToolCall }: ProviderRunInput): Promise<AgentResult> {
  const declarations: FunctionDeclaration[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: z.toJSONSchema(tool.input),
  }));
  const contents: Content[] = history.map((turn) => ({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.content }] }));
  const usage = { inputTokens: 0, outputTokens: 0 };

  for (let step = 1; step <= maxSteps; step++) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: system, tools: [{ functionDeclarations: declarations }], maxOutputTokens: 4096 },
    });
    usage.inputTokens += response.usageMetadata?.promptTokenCount ?? 0;
    usage.outputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

    const calls = response.functionCalls ?? [];
    const finish = response.candidates?.[0]?.finishReason;
    if (calls.length === 0) {
      if (!response.text && finish && finish !== "STOP") return { text: "", steps: step, usage, stopped: finish === "MAX_TOKENS" ? "truncated" : "refused" };
      return { text: (response.text ?? "").trim(), steps: step, usage, stopped: "done" };
    }

    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);
    const parts = [];
    for (const call of calls) {
      onToolCall?.(call.name ?? "");
      const { content, isError } = await runTool(tools, call.name ?? "", call.args ?? {});
      parts.push({ functionResponse: { name: call.name, id: call.id, response: isError ? { error: content } : { output: content } } });
    }
    contents.push({ role: "user", parts });
  }
  return { text: "", steps: maxSteps, usage, stopped: "step_limit" };
}

export function geminiProvider(apiKey: string): AgentProvider {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return { id: "gemini", model, run: (input) => runGeminiLoop(new GoogleGenAI({ apiKey }), model, input) };
}
